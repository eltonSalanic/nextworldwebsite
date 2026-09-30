import { authenticateUser, refreshAccessToken, revokeRefreshToken, createResetPasswordRequest, resetUserPassword } from "../services/authService.js";

export async function login(req, res){
  const {email, password} = req.body;

  const tokens = await authenticateUser(email, password);


  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: (parseInt(process.env.REFRESH_EXPIRY_DAYS) * 24 * 60 * 60 * 1000) //in milliseconds
  });

  //refresh token only goes in the httpOnly cookie, never the response body
  const { refreshToken, ...body } = tokens;
  res.status(200).json(body);
}

export async function refresh(req, res){
  const refreshToken = req.cookies.refreshToken;
  
  if(!refreshToken){
    return res.status(400).json({message: 'Refresh token required'});
  }
  
  const tokens = await refreshAccessToken(refreshToken);

  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: (parseInt(process.env.REFRESH_EXPIRY_DAYS) * 24 * 60 * 60 * 1000) //in milliseconds
  });

  //refresh token only goes in the httpOnly cookie, never the response body
  const { refreshToken: newRefreshToken, ...body } = tokens;
  res.status(200).json(body);
}

export async function logout(req, res){
  const refreshToken = req.cookies.refreshToken;
  
  if(refreshToken){
    await revokeRefreshToken(refreshToken);
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  })
  
  res.status(200).send();
}

export async function resetPasswordRequest(req, res){
  const { email } = req.body;

  await createResetPasswordRequest(email);
  
  return res.status(200).send();
}

export async function resetPassword(req, res){
  const {token, newPassword} = req.body;
  
  await resetUserPassword(token, newPassword);
  
  res.status(200).send();
}