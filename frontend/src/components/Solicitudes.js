import { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { Table, Spinner, Alert, Card, Form, Button, Row, Col, Badge } from 'react-bootstrap';
import { llamarBFF } from '../api/bffClient';
import { useRoles } from '../hooks/useRoles';

const ESTADOS = ['CREADA', 'ASIGNADA', 'EN_PROCESO', 'RESUELTA', 'CERRADA', 'CANCELADA'];
const FORMULARIO_VACIO = { titulo: '', descripcion: '', categoriaId: '', prioridad: '' };

/**
 * Solicitudes (todo sale del backend, no hay datos de ejemplo):
 * - Categorias: GET /v1/categorias-disponibles = copia local que ms-solicitudes recibio por RabbitMQ.
 * - Prioridades: GET /v1/prioridades (ms-catalogo).
 * - Cliente: ve sus solicitudes (GET /v1/solicitudes/mias).
 * - Operador y Administrador: ven todas (GET /v1/solicitudes) y cambian el estado (PATCH).
 *   La regla "no RESUELTA sin EN_PROCESO" la valida ms-solicitudes, no React.
 */
function Solicitudes({ usuarioActivo }) {
  const { instance, accounts } = useMsal();
  const [solicitudes, setSolicitudes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [prioridades, setPrioridades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);

  const rolesHook = useRoles();
  const roles = usuarioActivo?.roles?.length ? usuarioActivo.roles : rolesHook;
  const esOperador = roles.includes('ROLE_OPERADOR');
  const esAdmin = roles.includes('ROLE_ADMINISTRADOR');
  const puedeGestionar = esOperador || esAdmin;

  const llamar = (path, options) => llamarBFF(instance, accounts[0], path, options);

  const cargarSolicitudes = async () => {
    try {
      const path = puedeGestionar ? '/v1/solicitudes' : '/v1/solicitudes/mias';
      setSolicitudes((await llamar(path)) || []);
    } catch (err) {
      setError(`No se pudieron cargar las solicitudes: ${err.message}`);
    }
  };

  const cargarCategorias = async () => {
    try {
      setCategorias((await llamar('/v1/categorias-disponibles')) || []);
    } catch (err) {
      setError(`No se pudieron cargar las categorías disponibles: ${err.message}`);
    }
  };

  const cargarPrioridades = async () => {
    try {
      setPrioridades((await llamar('/v1/prioridades')) || []);
    } catch (err) {
      setError(`No se pudieron cargar las prioridades: ${err.message}`);
    }
  };

  useEffect(() => {
    if (accounts.length === 0) return;
    const cargarTodo = async () => {
      setCargando(true);
      await Promise.all([cargarSolicitudes(), cargarCategorias(), cargarPrioridades()]);
      setCargando(false);
    };
    cargarTodo();
    // Se vuelve a cargar cuando llegan los roles (cambia la ruta de solicitudes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, puedeGestionar]);

  const manejarCambio = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const crear = async (e) => {
    e.preventDefault();
    setError(null);
    setAviso(null);
    try {
      const creada = await llamar('/v1/solicitudes', {
        method: 'POST',
        body: JSON.stringify({
          titulo: formulario.titulo,
          descripcion: formulario.descripcion,
          categoriaId: Number(formulario.categoriaId),
          prioridad: formulario.prioridad
        })
      });
      setAviso(`Solicitud #${creada.id} creada con la categoría "${creada.categoria}".`);
      setFormulario(FORMULARIO_VACIO);
      cargarSolicitudes();
    } catch (err) {
      // 422: la categoria aun no llega a Solicitudes por RabbitMQ
      setError(err.message);
    }
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    setError(null);
    setAviso(null);
    try {
      await llamar(`/v1/solicitudes/${id}/estado?nuevoEstado=${nuevoEstado}`, { method: 'PATCH' });
      setAviso(`Solicitud #${id} cambió a ${nuevoEstado}.`);
    } catch (err) {
      // 400: regla de negocio (no se puede RESUELTA sin pasar por EN_PROCESO)
      setError(err.message);
    }
    cargarSolicitudes(); // siempre muestra el estado real guardado en RDS Solicitudes
  };

  const colorEstado = (estado) => ({
    RESUELTA: 'success', CERRADA: 'dark', EN_PROCESO: 'primary',
    ASIGNADA: 'info', CANCELADA: 'danger'
  }[estado] || 'secondary');

  if (cargando) return <Spinner animation="border" />;

  return (
    <div>
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      {aviso && <Alert variant="success" onClose={() => setAviso(null)} dismissible>{aviso}</Alert>}

      {/* Formulario de Nueva Solicitud */}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Card.Title>Nueva solicitud</Card.Title>
          <Form onSubmit={crear}>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>Título</Form.Label>
                <Form.Control
                  name="titulo"
                  value={formulario.titulo}
                  onChange={manejarCambio}
                  placeholder="Ej: Problemas de conexión a VPN"
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>Descripción</Form.Label>
                <Form.Control
                  name="descripcion"
                  value={formulario.descripcion}
                  onChange={manejarCambio}
                  placeholder="Detalle de la solicitud"
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>Categoría</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Select
                    name="categoriaId"
                    value={formulario.categoriaId}
                    onChange={manejarCambio}
                    required
                  >
                    <option value="">Seleccionar categoría</option>
                    {categorias.map((c) => (
                      <option key={c.categoriaId} value={c.categoriaId}>{c.nombre}</option>
                    ))}
                  </Form.Select>
                  <Button variant="outline-secondary" onClick={cargarCategorias} title="Volver a consultar las categorías disponibles">
                    ↻
                  </Button>
                </div>
                <Form.Text muted>
                  {categorias.length === 0
                    ? 'Aún no hay categorías disponibles. Si se acaba de crear una, espera unos segundos y presiona ↻.'
                    : 'Solo aparecen las categorías que ya llegaron a Solicitudes.'}
                </Form.Text>
              </Col>
              <Col md={6}>
                <Form.Label>Prioridad</Form.Label>
                <Form.Select
                  name="prioridad"
                  value={formulario.prioridad}
                  onChange={manejarCambio}
                  required
                >
                  <option value="">Seleccionar prioridad</option>
                  {prioridades.map((p) => (
                    <option key={p.id} value={p.nombre}>{p.nombre}</option>
                  ))}
                </Form.Select>
              </Col>
            </Row>
            <Button type="submit" variant="primary" className="mt-3">Crear</Button>
          </Form>
        </Card.Body>
      </Card>

      {/* Listado según el rol */}
      <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
        <div>
          <h5 className="mb-0 d-inline me-2">Listado de solicitudes</h5>
          {puedeGestionar
            ? <Badge bg="primary">Todas las solicitudes (Operador / Administrador)</Badge>
            : <Badge bg="secondary">Mis solicitudes (solo consulta de estado)</Badge>}
        </div>
        <Button variant="outline-secondary" size="sm" onClick={cargarSolicitudes}>↻ Actualizar</Button>
      </div>

      <Table striped bordered hover responsive className="bg-white shadow-sm">
        <thead className="table-light">
          <tr>
            <th style={{ width: '60px' }}>ID</th>
            <th>Título y detalle</th>
            {puedeGestionar && <th style={{ width: '200px' }}>Solicitante</th>}
            <th style={{ width: '150px' }}>Categoría</th>
            <th style={{ width: '110px' }}>Prioridad</th>
            <th style={{ width: '160px' }}>Estado</th>
            <th style={{ width: '150px' }}>Creada</th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.length === 0 ? (
            <tr>
              <td colSpan={puedeGestionar ? 7 : 6} className="text-center text-muted py-4">
                No hay solicitudes registradas.
              </td>
            </tr>
          ) : (
            solicitudes.map((s) => (
              <tr key={s.id}>
                <td><strong>#{s.id}</strong></td>
                <td>
                  <div><strong>{s.titulo}</strong></div>
                  <small className="text-muted">{s.descripcion}</small>
                </td>
                {puedeGestionar && <td><small>{s.usuarioId}</small></td>}
                <td><span className="badge bg-light text-dark border">{s.categoria}</span></td>
                <td>{s.prioridad}</td>
                <td>
                  {puedeGestionar ? (
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
                    <Badge bg={colorEstado(s.estado)}>{s.estado}</Badge>
                  )}
                </td>
                <td><small>{s.fechaCreacion ? new Date(s.fechaCreacion).toLocaleString('es-CL') : ''}</small></td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}

export default Solicitudes;