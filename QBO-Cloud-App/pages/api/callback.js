// Handles the callback from Intuit QBO after user logs in
import OAuthClient from 'intuit-oauth';

export default async function handler(req, res) {
  const parseRedirect = req.url; // e.g., /api/callback?code=xxx&realmId=yyy

  try {
    const oauthClient = new OAuthClient({
      clientId: process.env.QBO_CLIENT_ID,
      clientSecret: process.env.QBO_CLIENT_SECRET,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
      redirectUri: process.env.QBO_REDIRECT_URI,
    });

    // Exchange the authorization code for an Access Token
    const authResponse = await oauthClient.createToken(parseRedirect);
    
    // In a real production app, we would save authResponse.getJson() to a secure Database
    // Because this is a prototype, we just redirect back to the app with a success flag
    console.log('QBO Tokens successfully generated!');
    
    // Redirect back to our React dashboard
    res.redirect('/?qboConnected=true');
  } catch (e) {
    console.error('The error message is :', e.originalMessage);
    res.status(500).json({ error: 'Failed to process QBO Callback' });
  }
}
