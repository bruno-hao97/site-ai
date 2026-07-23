import { Router } from 'express';
import { GommoRegisterError, registerGommoUser } from '../services/gommoRegister.js';
import { isGommoRegisterConfigured } from '../config.js';

const router = Router();

router.get('/register/status', (_req, res) => {
  res.json({
    success: true,
    data: { configured: isGommoRegisterConfigured() },
  });
});

/** POST /api/auth/register — FE gửi form; server gắn manager_id + access_token admin. */
router.post('/register', async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = await registerGommoUser({
      name: typeof body.name === 'string' ? body.name : undefined,
      email: typeof body.email === 'string' ? body.email : '',
      password: typeof body.password === 'string' ? body.password : '',
      phone: typeof body.phone === 'string' ? body.phone : '',
      note: typeof body.note === 'string' ? body.note : undefined,
    });

    res.json({
      success: true,
      message: result.message || 'đăng ký thành công',
      access_token: result.accessToken,
    });
  } catch (err) {
    if (err instanceof GommoRegisterError) {
      res.status(err.status).json({ success: false, message: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error('[auth/register]', message);
    res.status(500).json({ success: false, message: message || 'Internal error' });
  }
});

export default router;
