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

  // Panel RabbitMQ (solo Administrador): publica una categoria real y muestra lo que respondio el backend
  const [nombreCatTest, setNombreCatTest] = useState('');
  const [descCatTest, setDescCatTest] = useState('');
  const [probandoFlujo, setProbandoFlujo] = useState(false);
  const [logFlujo, setLogFlujo] = useState(null);

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

  // Panel RabbitMQ: crea la categoria por el flujo real (React -> API Gateway -> BFF -> ms-catalogo)
  const publicarCategoria = async (e) => {
    e.preventDefault();
    if (!nombreCatTest.trim()) return;
    setProbandoFlujo(true);
    setLogFlujo({ tipo: 'info', mensaje: `Enviando "${nombreCatTest}" a ms-catalogo...` });
    try {
      const creada = await llamar('/v1/categorias', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombreCatTest, descripcion: descCatTest })
      });
      // 201: guardada en RDS Catalogo y RabbitMQ confirmo el evento (publisher confirm)
      setLogFlujo({
        tipo: 'success',
        mensaje: `Categoría "${creada.nombre}" (categoriaId=${creada.id}) guardada en RDS Catálogo y evento confirmado por RabbitMQ. ` +
                 `Presiona "↻ Verificar réplica local" para ver cuándo ms-solicitudes la guardó en su RDS.`
      });
      setNombreCatTest('');
      setDescCatTest('');
    } catch (err) {
      // 503 (P7): quedo guardada en Catalogo, pero el evento no se confirmo
      setLogFlujo({ tipo: 'danger', mensaje: err.message });
    } finally {
      setProbandoFlujo(false);
    }
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

      {/* Panel RabbitMQ (solo Administrador). Todo lo que muestra sale del backend real.
          El estado de la cola (Ready / Unacked / Consumers) se revisa en el panel de RabbitMQ (puerto 15672). */}
      {esAdmin && (
        <Card className="mt-4 shadow-sm border-0">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">
                <span className="me-2">🐇</span>
                Flujo de Sincronización Asíncrona (RabbitMQ)
              </h5>
              <Button variant="outline-secondary" size="sm" onClick={cargarCategorias}>
                ↻ Verificar réplica local
              </Button>
            </div>

            <Row className="g-3 text-center mb-3">
              <Col md={4}>
                <div className="p-3 border rounded bg-light h-100 text-start">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>1. Publicador</strong>
                    <Badge bg="primary">ms-catalogo · EC2 A</Badge>
                  </div>
                  <small className="text-muted d-block">
                    Guarda en RDS Catálogo y publica el evento CATEGORIA_CREADA:
                  </small>
                  <div className="mt-2 small">
                    <div><strong>Exchange:</strong> <code>catalogo.exchange</code> (direct)</div>
                    <div><strong>Routing Key:</strong> <code>categoria.creada</code></div>
                  </div>
                </div>
              </Col>

              <Col md={4}>
                <div className="p-3 border rounded bg-light h-100 text-start">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>2. Message Broker</strong>
                    <Badge bg="warning" text="dark">RabbitMQ 4.1 · EC2 C</Badge>
                  </div>
                  <small className="text-muted d-block">
                    Enruta y retiene los mensajes en una cola durable:
                  </small>
                  <div className="mt-2 small">
                    <div><strong>Virtual host:</strong> <code>mesatech</code> · <strong>AMQP:</strong> <code>5672</code></div>
                    <div><strong>Cola durable:</strong> <code>solicitudes.catalogo.queue</code></div>
                  </div>
                </div>
              </Col>

              <Col md={4}>
                <div className="p-3 border rounded bg-light h-100 text-start">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>3. Consumidor</strong>
                    <Badge bg="success">ms-solicitudes · EC2 B</Badge>
                  </div>
                  <small className="text-muted d-block">
                    Consume el mensaje, guarda la copia en su RDS y recién ahí confirma (ACK):
                  </small>
                  <div className="mt-2 small">
                    <div><strong>Listener:</strong> <code>@RabbitListener</code> (modo AUTO)</div>
                    <div><strong>Tabla local:</strong> <code>categorias_locales</code></div>
                  </div>
                </div>
              </Col>
            </Row>

            {/* Publicar una categoria por el flujo real */}
            <div className="p-3 border rounded bg-white mb-3">
              <small className="text-muted d-block mb-2">
                <strong>Publicar una nueva categoría y seguir su recorrido:</strong>
              </small>
              <Form onSubmit={publicarCategoria}>
                <Row className="g-2 align-items-center">
                  <Col md={4}>
                    <Form.Control
                      size="sm"
                      placeholder="Nombre de nueva categoría (ej: Impresoras)"
                      value={nombreCatTest}
                      onChange={(e) => setNombreCatTest(e.target.value)}
                      required
                    />
                  </Col>
                  <Col md={5}>
                    <Form.Control
                      size="sm"
                      placeholder="Descripción (opcional)"
                      value={descCatTest}
                      onChange={(e) => setDescCatTest(e.target.value)}
                    />
                  </Col>
                  <Col md={3}>
                    <Button type="submit" variant="primary" size="sm" className="w-100" disabled={probandoFlujo}>
                      {probandoFlujo ? 'Publicando...' : 'Publicar en RabbitMQ'}
                    </Button>
                  </Col>
                </Row>
              </Form>

              {logFlujo && (
                <Alert variant={logFlujo.tipo} className="mt-3 mb-0 py-2 small" dismissible onClose={() => setLogFlujo(null)}>
                  {logFlujo.mensaje}
                </Alert>
              )}

              <small className="text-muted d-block mt-2">
                Estado de la cola (Ready, Unacked, Consumers): panel de administración de RabbitMQ, puerto <code>15672</code> de la EC2 C.
              </small>
            </div>

            <div className="bg-light p-2 rounded border small d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <strong>Categorías sincronizadas en réplica local ({categorias.length}): </strong>
                {categorias.map((c) => (
                  <Badge key={c.categoriaId} bg="secondary" className="me-1">
                    {c.nombre}
                  </Badge>
                ))}
              </div>
              <span className="text-muted small">Endpoint: <code>/v1/categorias-disponibles</code></span>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}

export default Solicitudes;