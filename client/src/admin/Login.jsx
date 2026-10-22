import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api.js';
import { Alert, Button, Card, Field, Input, Logo } from '../components/ui.jsx';

export default function Login() {
  const nav = useNavigate();
  const [f, setF] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { token } = await api('/auth/login', { method: 'POST', body: f });
      setToken(token);
      nav('/admin');
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-sm space-y-4">
        <Logo />
        <p className="text-sm text-slate-400">Admin panelga kirish</p>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Login"><Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoFocus required /></Field>
          <Field label="Parol"><Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></Field>
          <Alert>{error}</Alert>
          <Button type="submit" className="w-full">Kirish</Button>
        </form>
      </Card>
    </div>
  );
}
