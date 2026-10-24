import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// .env har doim server/ papkasidan o'qiladi (qaysi papkadan ishga tushirilganidan qat'i nazar).
// Boshqa modullardan oldin import qilinishi kerak.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
