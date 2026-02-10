export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { timestamp, activityType, ...details } = req.body;

    // Get client IP address
    const clientIP = req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'Unknown';

    // Build the log entry here
    const logEntry = `
=== LOGIN HONEYPOT LOG ENTRY ===
Visitor IP Address: ${clientIP}

Timestamp: ${timestamp}

Requested URL or Endpoint: ${req.headers['referer'] || '/login'}

HTTP Method: ${req.method}

User-Agent: ${req.headers['user-agent'] || 'Unknown'}

Referrer: ${req.headers['referer'] || '(none)'}

Request Body / POST Data: ${JSON.stringify(details) || 'N/A'}

Login Attempted (Username / Password): ${details.username || 'N/A'}:${details.password || 'N/A'}

Command Attempted (SSH / Telnet Honeypot): ${details.commandAttempt || 'N/A'}

Exploit Payload or Input: ${details.exploitPayload || details.value || 'N/A'}

Uploaded or Downloaded File Info: Filename: ${details.fileName || 'N/A'}, Size: ${details.fileSize || 'N/A'} bytes, Type: ${details.fileType || 'N/A'}

GeoIP Location (Resolved from IP): ${details.geoLocation || 'Unknown'}

Port Accessed: ${details.port || '443'}

Protocol Used: ${details.protocol || 'HTTPS'}

Session Duration: Connected for ${details.sessionDuration || 'Unknown'} seconds

Number of Commands Issued: Commands: ${details.commandCount || '1'}

Detected Vulnerability Attempt: ${details.vulnerabilityType || activityType}

Bot Score / Risk Score: Bot Score: ${details.botScore || '85%'}, Risk: ${details.riskLevel || 'High'}

Honeypot Path Accessed: ${details.honeypotPath || '/fake_login_form'}

Headers: Content-Type: ${req.headers['content-type'] || 'application/json'}, User-Agent: ${req.headers['user-agent']?.substring(0, 50) || 'Unknown'}...

Activity Type: ${activityType}
Action: ${details.action || 'N/A'}
Additional Data: ${JSON.stringify(details, null, 2)}

=== END LOG ENTRY ===
`;

    console.log(logEntry);

    res.status(200).json({
      success: true,
      message: 'Login honeypot log entry logged successfully (Vercel environment)',
      timestamp,
      activityType,
      clientIP,
      environment: 'vercel'
    });

  } catch (error) {
    console.error('❌ Login honeypot logging error:', error);
    res.status(500).json({
      error: 'Failed to log login honeypot activity',
      details: error.message
    });
  }
} 