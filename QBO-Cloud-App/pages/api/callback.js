// Handles the callback from Intuit QBO after user logs in
import OAuthClient from 'intuit-oauth';

export default async function handler(req, res) {
  const parseRedirect = req.url; // e.g., /api/callback?code=xxx&realmId=yyy

  try {
    const oauthClient = new OAuthClient({
      clientId: process.env.QBO_CLIENT_ID,
      clientSecret: process.env.QBO_CLIENT_SECRET,
      environment: 'production',
      redirectUri: process.env.QBO_REDIRECT_URI,
    });

    // Exchange the authorization code for an Access Token
    const authResponse = await oauthClient.createToken(parseRedirect);
    
    // The Realm ID (Company ID) is passed in the query string by Intuit
    const realmId = req.query.realmId;

    // Securely set Cookies to remember the tokens on Vercel
    res.setHeader('Set-Cookie', [
      `qbo_access_token=${authResponse.getJson().access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600; Secure`,
      `qbo_realm_id=${realmId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600; Secure`
    ]);

    console.log('QBO Tokens successfully saved to Secure Browser Cookies!');
    
    // Redirect back to our React dashboard
    res.redirect('/?qboConnected=true');
  } catch (e) {
    console.error('The error message is :', e.originalMessage);
    res.status(500).json({ error: 'Failed to process QBO Callback' });
  }
}
