import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { Container, Button } from 'react-bootstrap';
import { loginRequest } from './authConfig';
import Solicitudes from './components/Solicitudes';
import { useRoles } from './hooks/useRoles';
import Login from './components/Login';

function App() {
  const { instance, accounts } = useMsal();
  const roles = useRoles();

  const estiloFondoAutenticado = {
    backgroundImage: `linear-gradient(rgba(214, 222, 234, 0.85), rgba(156, 169, 187, 0.85)), url('/fondo2.png')`,
  };

  const iniciarSesion = () => {
    instance.loginRedirect(loginRequest).catch((error) => {
      console.error(error);
    });
  };

  const cerrarSesion = () => {
    instance.logoutRedirect();
  };

  return (
    <>
      <UnauthenticatedTemplate>
        <Login onLogin={iniciarSesion} />
      </UnauthenticatedTemplate>

      <AuthenticatedTemplate>
        <div className="app-autenticado" style={estiloFondoAutenticado}>
          <Container className="py-4">
            <h1>MesaTech Cloud</h1>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                {accounts.length > 0 && (
                  <>
                    <p className="mb-0">Bienvenida, {accounts[0].name}</p>
                    <small className="text-muted">{accounts[0].username}</small>
                    <p className="mb-0"><small>Rol: {roles.length > 0 ? roles.join(', ') : 'sin rol asignado'}</small></p>
                  </>
                )}
              </div>
              <Button variant="dark" onClick={cerrarSesion}>Cerrar sesión</Button>
            </div>
            <hr />
            <h3>Mis solicitudes</h3>
            <Solicitudes />
          </Container>
        </div>
      </AuthenticatedTemplate>
    </>
  );
}

export default App;