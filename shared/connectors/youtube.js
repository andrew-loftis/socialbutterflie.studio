import fetch from 'node-fetch';

// Simple multipart upload for smaller files via URL download (server will need to fetch the media first)
// In production, use resumable uploads. Here we expect a public media_url and we'll proxy bytes.
export async function uploadYouTube({ access_token, title, description, publishAtIso, mediaBuffer, mimeType }) {
  const metadata = {
    snippet: { title, description },
    status: publishAtIso ? { privacyStatus: 'private', publishAt: publishAtIso } : { privacyStatus: 'public' }
  };
  const boundary = 'xxxBOUNDARYxxx';
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` + JSON.stringify(metadata) + `\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    mediaBuffer,
    Buffer.from(`\r\n--${boundary}--`)
  ]);
  const res = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + access_token, 'Content-Type': 'multipart/related; boundary=' + boundary },
    body
  }).then(r => r.json());
  if (!res.id) throw new Error('YouTube upload failed: ' + JSON.stringify(res));
  return res.id;
}
