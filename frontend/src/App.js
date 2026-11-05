import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { Container, Button } from 'react-bootstrap';
import { loginRequest } from './authConfig';
import Solicitudes from './components/Solicitudes';
import Categorias from './components/Categorias';
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
    if (accounts.length > 0) {
      instance.logoutRedirect();
    }
  };

  const usuarioActivo = {
    nombre: accounts[0]?.name || '',
    email: accounts[0]?.username || '',
    roles: roles
  };

  const esAdministrador = roles.includes('ROLE_ADMINISTRADOR');
  const esOperador = roles.includes('ROLE_OPERADOR');

  return (
    <>
      <UnauthenticatedTemplate>
        <Login onLogin={iniciarSesion} />
      </UnauthenticatedTemplate>

      <AuthenticatedTemplate>
        <div className="app-autenticado" style={estiloFondoAutenticado}>
          <Container className="py-4">
            {/* Cabecera */}
            <div className="d-flex justify-content-between align-items-center mb-1">
              <h1 className="mb-0">MesaTech Cloud</h1>
              <Button variant="dark" size="sm" onClick={cerrarSesion}>Cerrar sesión</Button>
            </div>

            {/* Barra de Perfil Real de Azure AD */}
            <div className="mb-3">
              {accounts.length > 0 && (
                <>
                  <p className="mb-0"><strong>Bienvenida:</strong> {usuarioActivo.nombre}</p>
                  <small className="text-muted">{usuarioActivo.email}</small>
                  <p className="mb-0">
                    <small>
                      <strong>Rol:</strong> {roles.length > 0 ? roles.join(', ') : 'sin rol asignado'}
                    </small>
                  </p>
                </>
              )}
            </div>

            <hr />

            {/* Mantenimiento de Catálogo (Visible únicamente para Administrador) */}
            {esAdministrador && (
              <div className="mb-4">
                <Categorias />
                <hr className="my-4" />
              </div>
            )}

            <h3 className="mb-2">
              {esAdministrador || esOperador ? 'Solicitudes de soporte' : 'Mis solicitudes'}
            </h3>

            <Solicitudes usuarioActivo={usuarioActivo} />
          </Container>
        </div>
      </AuthenticatedTemplate>
    </>
  );
}

export default App;