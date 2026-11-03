import { Button } from 'react-bootstrap';
import './Login.css';

function Login({ onLogin }) {
  const estiloFondo = {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('/fondo3.png')`,
  };

  return (
    <div className="login-fondo" style={estiloFondo}>
      <div className="login-card">
        <img src="/logo192.png" alt="MesaTech Cloud" className="login-logo" />
        <h1 className="mb-2">MesaTech Cloud</h1>
        <p className="text-muted small mb-3">Usuario debe autenticarse</p>
        <Button variant="primary" className="w-100" onClick={onLogin}>
          Iniciar sesión con Microsoft (Azure AD)
        </Button>
      </div>
    </div>
  );
}

export default Login;
