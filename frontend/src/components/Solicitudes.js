import { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { Table, Spinner, Alert, Card, Form, Button, Row, Col } from 'react-bootstrap';
import { llamarBFF } from '../api/bffClient';
import { useRoles } from '../hooks/useRoles';

const FORMULARIO_VACIO = { titulo: '', descripcion: '', categoria: '', prioridad: '' };
const ESTADOS = ['CREADA', 'ASIGNADA', 'EN_PROCESO', 'RESUELTA', 'CERRADA', 'CANCELADA'];

function Solicitudes() {
  const { instance, accounts } = useMsal();
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const roles = useRoles();
  const puedeCambiarEstado = roles.includes('ROLE_OPERADOR') || roles.includes('ROLE_ADMINISTRADOR');

  const cargarSolicitudes = async () => {
    try {
      setCargando(true);
      const datos = await llamarBFF(instance, accounts[0], '/v1/solicitudes/mias');
      setSolicitudes(datos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manejarCambio = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const crear = async (e) => {
    e.preventDefault();
    try {
      await llamarBFF(instance, accounts[0], '/v1/solicitudes', {
        method: 'POST',
        body: JSON.stringify(formulario)
      });
      setFormulario(FORMULARIO_VACIO);
      cargarSolicitudes();
    } catch (err) {
      setError(err.message);
    }
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      await llamarBFF(instance, accounts[0], `/v1/solicitudes/${id}/estado?nuevoEstado=${nuevoEstado}`, {
        method: 'PATCH'
      });
      cargarSolicitudes();
    } catch (err) {
      setError(err.message);
    }
  };

  if (cargando) return <Spinner animation="border" />;

  return (
    <div>
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Card.Title>Nueva solicitud</Card.Title>
          <Form onSubmit={crear}>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>Título</Form.Label>
                <Form.Control name="titulo" value={formulario.titulo} onChange={manejarCambio} required />
              </Col>
              <Col md={6}>
                <Form.Label>Descripción</Form.Label>
                <Form.Control name="descripcion" value={formulario.descripcion} onChange={manejarCambio} />
              </Col>
              <Col md={3}>
                <Form.Label>Categoría</Form.Label>
                <Form.Control name="categoria" value={formulario.categoria} onChange={manejarCambio} required />
              </Col>
              <Col md={3}>
                <Form.Label>Prioridad</Form.Label>
                <Form.Control name="prioridad" value={formulario.prioridad} onChange={manejarCambio} required />
              </Col>
            </Row>
            <Button type="submit" variant="primary" className="mt-3">Crear</Button>
          </Form>
        </Card.Body>
      </Card>

      <Table striped bordered hover>
        <thead>
          <tr>
            <th>ID</th><th>Título</th><th>Categoría</th><th>Prioridad</th><th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.map((s) => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.titulo}</td>
              <td>{s.categoria}</td>
              <td>{s.prioridad}</td>
              <td>
                {puedeCambiarEstado ? (
                  <Form.Select
                    size="sm"
                    value={s.estado}
                    onChange={(e) => cambiarEstado(s.id, e.target.value)}
                  >
                    {ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
                  </Form.Select>
                ) : (
                  s.estado
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

export default Solicitudes;