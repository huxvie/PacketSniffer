// ─── WebSocket Frame Parser & Relay ──────────────────────────────────────────
// Parses RFC 6455 WebSocket frames in-transit between client and server,
// emitting each decoded message to the UI while transparently forwarding
// all bytes. Handles text, binary, close, ping, and pong frames.
// Reassembles fragmented messages (FIN=0 continuation frames).

use serde::Serialize;
use std::sync::Arc;
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};

/// Max payload we'll capture for the UI (256 KB). Larger payloads are truncated.
const MAX_CAPTURE: usize = 256 * 1024;

/// A decoded WebSocket message emitted to the UI.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WsMessage {
    /// Session ID of the parent WebSocket connection
    pub session_id: u64,
    /// Sequential message number within this connection
    pub index: u64,
    /// Direction: "send" (client→server) or "recv" (server→client)
    pub direction: String,
    /// Opcode: "text", "binary", "close", "ping", "pong"
    pub opcode: String,
    /// Payload length in bytes (full, not truncated)
    pub length: u64,
    /// Payload as UTF-8 string (text frames) or "[Binary: N bytes]" placeholder
    pub data: Option<String>,
    /// Timestamp in ms since the WS connection was established
    pub timestamp_ms: f64,
}

/// WebSocket frame opcodes (RFC 6455 Section 5.2)
#[derive(Debug, Clone, Copy, PartialEq)]
enum Opcode {
    Continuation, // 0x0
    Text,         // 0x1
    Binary,       // 0x2
    Close,        // 0x8
    Ping,         // 0x9
    Pong,         // 0xA
    Unknown(u8),
}

impl Opcode {
    fn from_u8(b: u8) -> Self {
        match b {
            0x0 => Opcode::Continuation,
            0x1 => Opcode::Text,
            0x2 => Opcode::Binary,
            0x8 => Opcode::Close,
            0x9 => Opcode::Ping,
            0xA => Opcode::Pong,
            other => Opcode::Unknown(other),
        }
    }

    fn as_str(&self) -> &'static str {
        match self {
            Opcode::Continuation => "continuation",
            Opcode::Text => "text",
            Opcode::Binary => "binary",
            Opcode::Close => "close",
            Opcode::Ping => "ping",
            Opcode::Pong => "pong",
            Opcode::Unknown(_) => "unknown",
        }
    }

    fn is_data(&self) -> bool {
        matches!(self, Opcode::Text | Opcode::Binary | Opcode::Continuation)
    }
}

/// State for reassembling fragmented messages.
struct FragmentState {
    /// The opcode of the first frame in the fragment sequence
    opcode: Opcode,
    /// Accumulated payload bytes
    buffer: Vec<u8>,
    /// Total payload length (may exceed MAX_CAPTURE)
    total_len: u64,
}

/// Run the WebSocket relay: reads frames from `reader`, writes them to `writer`,
/// and emits decoded messages via `on_message`.
///
/// `direction` should be "send" or "recv".
/// `is_masked` should be true for client→server (clients MUST mask per RFC 6455).
async fn relay_frames<R, W>(
    mut reader: R,
    mut writer: W,
    session_id: u64,
    direction: &str,
    start_time: std::time::Instant,
    msg_counter: Arc<std::sync::atomic::AtomicU64>,
    on_message: Arc<dyn Fn(WsMessage) + Send + Sync>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>>
where
    R: AsyncRead + Unpin,
    W: AsyncWrite + Unpin,
{
    let mut fragment: Option<FragmentState> = None;

    loop {
        // ── Read frame header (2 bytes minimum) ─────────────────────────
        let mut header = [0u8; 2];
        if reader.read_exact(&mut header).await.is_err() {
            break; // Connection closed
        }

        let fin = (header[0] & 0x80) != 0;
        let opcode = Opcode::from_u8(header[0] & 0x0F);
        let masked = (header[1] & 0x80) != 0;
        let len_byte = header[1] & 0x7F;

        // Forward header bytes immediately
        writer.write_all(&header).await?;

        // ── Read extended payload length ────────────────────────────────
        let payload_len: u64 = if len_byte < 126 {
            len_byte as u64
        } else if len_byte == 126 {
            let mut ext = [0u8; 2];
            reader.read_exact(&mut ext).await?;
            writer.write_all(&ext).await?;
            u16::from_be_bytes(ext) as u64
        } else {
            // len_byte == 127
            let mut ext = [0u8; 8];
            reader.read_exact(&mut ext).await?;
            writer.write_all(&ext).await?;
            u64::from_be_bytes(ext)
        };

        // ── Read masking key (4 bytes if masked) ────────────────────────
        let mask_key = if masked {
            let mut key = [0u8; 4];
            reader.read_exact(&mut key).await?;
            writer.write_all(&key).await?;
            Some(key)
        } else {
            None
        };

        // ── Read and forward payload in chunks ──────────────────────────
        // We capture up to MAX_CAPTURE bytes for the UI, but always forward everything.
        let capture_len = std::cmp::min(payload_len, MAX_CAPTURE as u64) as usize;
        let mut captured = Vec::with_capacity(capture_len);
        let mut remaining = payload_len;

        let mut chunk = vec![0u8; std::cmp::min(remaining as usize, 32768)];
        while remaining > 0 {
            let to_read = std::cmp::min(remaining as usize, chunk.len());
            let n = reader.read_exact(&mut chunk[..to_read]).await.map(|_| to_read);
            match n {
                Ok(n) => {
                    writer.write_all(&chunk[..n]).await?;
                    if captured.len() < capture_len {
                        let take = std::cmp::min(n, capture_len - captured.len());
                        captured.extend_from_slice(&chunk[..take]);
                    }
                    remaining -= n as u64;
                }
                Err(_) => break,
            }
        }

        // Flush after each frame
        let _ = writer.flush().await;

        // ── Unmask captured payload for inspection ──────────────────────
        if let Some(key) = mask_key {
            for (i, byte) in captured.iter_mut().enumerate() {
                *byte ^= key[i % 4];
            }
        }

        // ── Handle fragmentation ────────────────────────────────────────
        if opcode.is_data() {
            if opcode != Opcode::Continuation {
                // Start of a new message (possibly fragmented)
                if fin {
                    // Complete single-frame message
                    emit_message(
                        session_id,
                        direction,
                        &opcode,
                        &captured,
                        payload_len,
                        start_time,
                        &msg_counter,
                        &on_message,
                    );
                } else {
                    // First frame of a fragmented message
                    fragment = Some(FragmentState {
                        opcode,
                        buffer: captured,
                        total_len: payload_len,
                    });
                }
            } else if let Some(ref mut frag) = fragment {
                // Continuation frame
                let space = MAX_CAPTURE.saturating_sub(frag.buffer.len());
                if space > 0 {
                    let take = std::cmp::min(captured.len(), space);
                    frag.buffer.extend_from_slice(&captured[..take]);
                }
                frag.total_len += payload_len;

                if fin {
                    // Final continuation frame — emit reassembled message
                    let frag_data = fragment.take().unwrap();
                    emit_message(
                        session_id,
                        direction,
                        &frag_data.opcode,
                        &frag_data.buffer,
                        frag_data.total_len,
                        start_time,
                        &msg_counter,
                        &on_message,
                    );
                }
            }
            // else: orphaned continuation frame — ignore
        } else {
            // Control frame (close, ping, pong) — always single-frame
            emit_message(
                session_id,
                direction,
                &opcode,
                &captured,
                payload_len,
                start_time,
                &msg_counter,
                &on_message,
            );

            if opcode == Opcode::Close {
                break; // Connection closing
            }
        }
    }

    Ok(())
}

/// Emit a decoded WebSocket message to the UI callback.
fn emit_message(
    session_id: u64,
    direction: &str,
    opcode: &Opcode,
    payload: &[u8],
    full_length: u64,
    start_time: std::time::Instant,
    msg_counter: &std::sync::atomic::AtomicU64,
    on_message: &Arc<dyn Fn(WsMessage) + Send + Sync>,
) {
    let data = match opcode {
        Opcode::Text | Opcode::Close => {
            // Text frames should be valid UTF-8
            let text = String::from_utf8_lossy(payload);
            if text.len() > MAX_CAPTURE {
                Some(format!("{}...[truncated]", &text[..MAX_CAPTURE]))
            } else {
                Some(text.into_owned())
            }
        }
        Opcode::Binary => {
            if full_length == 0 {
                Some("[Binary: 0 bytes]".to_string())
            } else {
                Some(format!("[Binary: {} bytes]", full_length))
            }
        }
        Opcode::Ping => Some(format!("[Ping: {} bytes]", full_length)),
        Opcode::Pong => Some(format!("[Pong: {} bytes]", full_length)),
        _ => Some(format!("[{}: {} bytes]", opcode.as_str(), full_length)),
    };

    let index = msg_counter.fetch_add(1, std::sync::atomic::Ordering::Relaxed);

    let msg = WsMessage {
        session_id,
        index,
        direction: direction.to_string(),
        opcode: opcode.as_str().to_string(),
        length: full_length,
        data,
        timestamp_ms: start_time.elapsed().as_secs_f64() * 1000.0,
    };

    on_message(msg);
}

/// Run the full bidirectional WebSocket relay with frame inspection.
/// Spawns two tasks (client→server and server→client) and waits for either
/// to finish (indicating the connection closed).
pub async fn relay_websocket<CR, CW, SR, SW>(
    client_read: CR,
    client_write: CW,
    server_read: SR,
    server_write: SW,
    session_id: u64,
    on_message: Arc<dyn Fn(WsMessage) + Send + Sync>,
) where
    CR: AsyncRead + Unpin + Send + 'static,
    CW: AsyncWrite + Unpin + Send + 'static,
    SR: AsyncRead + Unpin + Send + 'static,
    SW: AsyncWrite + Unpin + Send + 'static,
{
    let start_time = std::time::Instant::now();
    let msg_counter = Arc::new(std::sync::atomic::AtomicU64::new(0));

    let on_msg_c2s = Arc::clone(&on_message);
    let counter_c2s = Arc::clone(&msg_counter);

    let on_msg_s2c = on_message;
    let counter_s2c = msg_counter;

    // Client → Server (client frames are masked per RFC 6455)
    let c2s = tokio::spawn(async move {
        if let Err(e) = relay_frames(
            client_read,
            server_write,
            session_id,
            "send",
            start_time,
            counter_c2s,
            on_msg_c2s,
        )
        .await
        {
            log::debug!("WS relay client->server ended: {}", e);
        }
    });

    // Server → Client (server frames are NOT masked)
    let s2c = tokio::spawn(async move {
        if let Err(e) = relay_frames(
            server_read,
            client_write,
            session_id,
            "recv",
            start_time,
            counter_s2c,
            on_msg_s2c,
        )
        .await
        {
            log::debug!("WS relay server->client ended: {}", e);
        }
    });

    // Wait for either direction to finish
    tokio::select! {
        _ = c2s => {
            log::debug!("WS session {} client->server task completed", session_id);
        }
        _ = s2c => {
            log::debug!("WS session {} server->client task completed", session_id);
        }
    }
}
