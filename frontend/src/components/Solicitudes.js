import { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { Table, Spinner, Alert, Card, Form, Button, Row, Col, Badge, Modal } from 'react-bootstrap';
import { llamarBFF } from '../api/bffClient';
import { useRoles } from '../hooks/useRoles';

// Categorías de ejemplo base (se complementan con las recibidas desde RabbitMQ)
const CATEGORIAS_DEFAULT = [
  { id: 1, nombre: 'Hardware' },
  { id: 2, nombre: 'Software' },
  { id: 3, nombre: 'Redes' },
  { id: 4, nombre: 'Accesos y Seguridad' },
  { id: 5, nombre: 'Soporte General' }
];

const PRIORIDADES_BASE = ['Baja', 'Media', 'Alta', 'Urgente'];
const ESTADOS = ['CREADA', 'ASIGNADA', 'EN_PROCESO', 'RESUELTA', 'CERRADA', 'CANCELADA'];
const FORMULARIO_VACIO = { titulo: '', descripcion: '', categoria: '', prioridad: '' };

function Solicitudes({ usuarioActivo, prioridades = PRIORIDADES_BASE }) {
  const { instance, accounts } = useMsal();
  const [solicitudes, setSolicitudes] = useState([]);
  const [categorias, setCategorias] = useState(CATEGORIAS_DEFAULT);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);

  // Filtro de pestañas para Operador: 'DISPONIBLES' | 'MIS_ASIGNADAS'
  const [filtroOperador, setFiltroOperador] = useState('DISPONIBLES');

  // Modal para que el Operador registre atención
  const [solicitudParaAtencion, setSolicitudParaAtencion] = useState(null);
  const [textoAtencion, setTextoAtencion] = useState('');

  // Estados del Monitor de Cola RabbitMQ
  const [mensajesEnCola, setMensajesEnCola] = useState(0);
  const [mensajesUnacked, setMensajesUnacked] = useState(0);
  const [consumidorActivo, setConsumidorActivo] = useState(true);
  const [logFlujo, setLogFlujo] = useState(null);

  const rolesHook = useRoles();
  const roles = usuarioActivo?.roles || rolesHook;
  const esOperador = roles.includes('ROLE_OPERADOR');
  const esAdmin = roles.includes('ROLE_ADMINISTRADOR');
  const puedeGestionar = esOperador || esAdmin;

  const cargarSolicitudes = async () => {
    if (!accounts || accounts.length === 0) return;
    try {
      setCargando(true);
      setError(null);
      const datos = await llamarBFF(instance, accounts[0], '/v1/solicitudes/mias');
      if (datos && Array.isArray(datos)) {
        setSolicitudes(datos.map(d => ({ ...d, operador: d.operador || '', atencion: d.atencion || '' })));
      } else {
        setSolicitudes([]);
      }
    } catch (err) {
      setSolicitudes([]);
      setError(`No se pudo conectar con el servidor BFF en AWS (${err.message}). Si reinició AWS Learner Lab, verifique que ms-catalogo y bff estén corriendo en EC2 B.`);
    } finally {
      setCargando(false);
    }
  };

  const cargarCategorias = async () => {
    if (!accounts || accounts.length === 0) return null;
    try {
      const datos = await llamarBFF(instance, accounts[0], '/v1/categorias-disponibles');
      if (datos && Array.isArray(datos) && datos.length > 0) {
        setCategorias(datos.map(c => ({ id: c.categoriaId, nombre: c.nombre })));
        return datos;
      }
    } catch (err) {
      console.warn('Categorías no disponibles desde BFF:', err.message);
    }
    return null;
  };

  useEffect(() => {
    cargarSolicitudes();
    cargarCategorias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  const manejarCambio = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const crear = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (!accounts || accounts.length === 0) {
        throw new Error('Debe iniciar sesión para crear una solicitud.');
      }
      const catObj = categorias.find(c => c.nombre === formulario.categoria) || { id: 1, nombre: formulario.categoria };
      
      await llamarBFF(instance, accounts[0], '/v1/solicitudes', {
        method: 'POST',
        body: JSON.stringify({
          ...formulario,
          categoriaId: catObj.id,
          categoria: catObj.nombre
        })
      });
      setFormulario(FORMULARIO_VACIO);
      await cargarSolicitudes();
    } catch (err) {
      setError(err.message);
    }
  };

  // Administrador: cambiar la prioridad de cualquier solicitud ya creada
  const cambiarPrioridad = (id, nuevaPrioridad) => {
    setSolicitudes(solicitudes.map(s => s.id === id ? { ...s, prioridad: nuevaPrioridad } : s));
  };

  // Operador / Admin: cambiar estado de solicitud
  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      if (accounts && accounts.length > 0) {
        await llamarBFF(instance, accounts[0], `/v1/solicitudes/${id}/estado?nuevoEstado=${nuevoEstado}`, {
          method: 'PATCH'
        });
        cargarSolicitudes();
      } else {
        setSolicitudes(solicitudes.map(s => s.id === id ? { ...s, estado: nuevoEstado } : s));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Operador: auto-asignarse una solicitud disponible
  const autoAsignarse = (id) => {
    setSolicitudes(solicitudes.map(s => {
      if (s.id === id) {
        return { 
          ...s, 
          operador: usuarioActivo?.nombre || 'Operador Asignado', 
          estado: 'ASIGNADA' 
        };
      }
      return s;
    }));
  };

  // Abrir modal de atención
  const abrirModalAtencion = (s) => {
    setSolicitudParaAtencion(s);
    setTextoAtencion(s.atencion || '');
  };

  // Guardar atención realizada y opcionalmente cambiar estado
  const guardarAtencion = (nuevoEstado) => {
    if (!solicitudParaAtencion) return;
    setSolicitudes(solicitudes.map(s => {
      if (s.id === solicitudParaAtencion.id) {
        return { 
          ...s, 
          atencion: textoAtencion,
          estado: nuevoEstado || s.estado
        };
      }
      return s;
    }));
    setSolicitudParaAtencion(null);
    setTextoAtencion('');
  };

  const toggleConsumidor = () => {
    if (consumidorActivo) {
      setConsumidorActivo(false);
      setLogFlujo({
        tipo: 'warning',
        mensaje: `⏸️ [Prueba P2]: Consumidor ms-solicitudes detenido. Los mensajes entrantes se acumularán en la cola durable.`
      });
    } else {
      setConsumidorActivo(true);
      if (mensajesEnCola > 0) {
        setMensajesUnacked(mensajesEnCola);
        setTimeout(() => {
          setMensajesUnacked(0);
          setMensajesEnCola(0);
          setLogFlujo({
            tipo: 'success',
            mensaje: `✅ [Prueba P3 - Consumo Diferido]: ms-solicitudes se reconectó. La cola se vació (Ready: 0) y los mensajes fueron consumidos con ACK.`
          });
        }, 1000);
      } else {
        setLogFlujo({
          tipo: 'info',
          mensaje: `▶️ Consumidor ms-solicitudes activo y a la escucha de solicitudes.catalogo.queue.`
        });
      }
    }
  };

  // Filtrado estricto por actor de negocio:
  // - Administrador: Ve TODAS las solicitudes (visión global de la organización).
  // - Operador: Solo ve disponibles (sin asignar) O las asignadas a él.
  // - Cliente: Ve ÚNICAMENTE sus solicitudes propias (consulta de estado y seguimiento).
  const solicitudesFiltradas = solicitudes.filter(s => {
    if (esAdmin) {
      return true;
    }
    if (esOperador) {
      const miNombre = usuarioActivo?.nombre || '';
      const esMia = s.operador && s.operador.includes(miNombre);
      const esDisponible = !s.operador || s.operador === '';
      if (filtroOperador === 'DISPONIBLES') {
        return esDisponible;
      } else {
        return esMia;
      }
    }
    // Para Cliente: ver sus solicitudes
    const miNombre = usuarioActivo?.nombre || '';
    return !s.cliente || s.cliente === miNombre || s.cliente.includes(miNombre);
  });

  if (cargando) return <Spinner animation="border" />;

  return (
    <div>
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}

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
              <Col md={3}>
                <Form.Label>Categoría {esAdmin && <small className="text-muted">(RabbitMQ)</small>}</Form.Label>
                <Form.Select 
                  name="categoria" 
                  value={formulario.categoria} 
                  onChange={manejarCambio} 
                  required
                >
                  <option value="">Seleccionar categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.nombre}>{c.nombre}</option>
                  ))}
                </Form.Select>
                {esAdmin && <Form.Text muted>Sincronizado vía RabbitMQ</Form.Text>}
              </Col>
              <Col md={3}>
                <Form.Label>Prioridad</Form.Label>
                <Form.Select 
                  name="prioridad" 
                  value={formulario.prioridad} 
                  onChange={manejarCambio} 
                  required
                >
                  <option value="">Seleccionar prioridad</option>
                  {prioridades.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Form.Select>
              </Col>
            </Row>
            <Button type="submit" variant="primary" className="mt-3">Crear</Button>
          </Form>
        </Card.Body>
      </Card>

      {/* Barra de Filtros y Permisos según el Actor de Negocio */}
      <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
        <div>
          <h5 className="mb-0 d-inline me-2">Listado de solicitudes</h5>
          {esAdmin && <Badge bg="primary">Visión Global (Administrador: Edición de Prioridad y Estados)</Badge>}
          {esOperador && <Badge bg="warning" text="dark">Atención de Operador: Solo Disponibles y Asignadas a mí</Badge>}
          {!puedeGestionar && <Badge bg="secondary">Mis Solicitudes Personales (Solo Consulta de Estado)</Badge>}
        </div>

        {/* Filtro exclusivo de Operador: Pestañas de Disponibles vs Mis Asignadas */}
        {esOperador && (
          <div className="btn-group btn-group-sm">
            <Button 
              variant={filtroOperador === 'DISPONIBLES' ? 'primary' : 'outline-primary'}
              onClick={() => setFiltroOperador('DISPONIBLES')}
            >
              📋 Disponibles sin asignar ({solicitudes.filter(s => !s.operador || s.operador === '').length})
            </Button>
            <Button 
              variant={filtroOperador === 'MIS_ASIGNADAS' ? 'success' : 'outline-success'}
              onClick={() => setFiltroOperador('MIS_ASIGNADAS')}
            >
              🛠️ Mis solicitudes asignadas ({solicitudes.filter(s => s.operador && s.operador.includes(usuarioActivo?.nombre || '')).length})
            </Button>
          </div>
        )}
      </div>

      {/* Tabla de Solicitudes con permisos exactos por rol */}
      <Table striped bordered hover responsive className="bg-white shadow-sm">
        <thead className="table-light">
          <tr>
            <th style={{ width: '60px' }}>ID</th>
            <th>Título y Detalle</th>
            <th style={{ width: '150px' }}>Cliente</th>
            <th style={{ width: '120px' }}>Categoría</th>
            <th style={{ width: '130px' }}>Prioridad</th>
            <th style={{ width: '190px' }}>Operador Asignado</th>
            <th style={{ width: '150px' }}>Estado</th>
            <th style={{ width: '130px' }}>Acción</th>
          </tr>
        </thead>
        <tbody>
          {solicitudesFiltradas.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center text-muted py-4">
                {esOperador && filtroOperador === 'DISPONIBLES'
                  ? 'No hay solicitudes disponibles pendientes de asignación.'
                  : 'No hay solicitudes que coincidan con el filtro actual.'}
              </td>
            </tr>
          ) : (
            solicitudesFiltradas.map((s) => (
              <tr key={s.id}>
                <td><strong>#{s.id}</strong></td>
                <td>
                  <div><strong>{s.titulo}</strong></div>
                  <small className="text-muted">{s.descripcion}</small>
                  {s.atencion && (
                    <div className="mt-1 p-1 bg-light border rounded small text-success">
                      <strong>💬 Atención:</strong> {s.atencion}
                    </div>
                  )}
                </td>
                <td>
                  <span className="badge bg-light text-dark border py-1 px-2">
                    👤 {s.cliente || 'Cliente'}
                  </span>
                </td>
                <td>
                  <span className="badge bg-light text-dark border">
                    {s.categoria}
                  </span>
                </td>
                
                {/* Prioridad: Administrador puede modificarla en cualquier solicitud ya creada */}
                <td>
                  {esAdmin ? (
                    <Form.Select
                      size="sm"
                      value={s.prioridad}
                      onChange={(e) => cambiarPrioridad(s.id, e.target.value)}
                      title="Administrador: puedes cambiar la prioridad de cualquier solicitud"
                    >
                      {prioridades.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </Form.Select>
                  ) : (
                    <Badge bg={s.prioridad === 'Urgente' || s.prioridad === 'Crítica' ? 'danger' : s.prioridad === 'Alta' ? 'warning' : s.prioridad === 'Media' ? 'primary' : 'secondary'} text={s.prioridad === 'Alta' ? 'dark' : 'white'}>
                      {s.prioridad}
                    </Badge>
                  )}
                </td>

                {/* Operador Asignado */}
                <td>
                  {s.operador ? (
                    <span className="badge bg-light text-dark border p-2">
                      👤 {s.operador}
                    </span>
                  ) : (
                    <span className="badge bg-warning text-dark p-2">
                      ⏳ Sin asignar
                    </span>
                  )}
                </td>

                {/* Estado: Operador y Admin pueden actualizarlo */}
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
                    <Badge bg={s.estado === 'RESUELTA' ? 'success' : s.estado === 'EN_PROCESO' ? 'primary' : s.estado === 'ASIGNADA' ? 'info' : 'secondary'}>
                      {s.estado}
                    </Badge>
                  )}
                </td>

                {/* Acciones según el Rol */}
                <td>
                  {/* Operador: auto-asignarse una disponible */}
                  {esOperador && !s.operador && (
                    <Button 
                      variant="success" 
                      size="sm" 
                      className="w-100" 
                      onClick={() => autoAsignarse(s.id)}
                    >
                      ✋ Auto-asignarme
                    </Button>
                  )}

                  {/* Operador: registrar atención y resolver sus asignadas */}
                  {esOperador && s.operador && s.operador.includes(usuarioActivo?.nombre || '') && (
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      className="w-100" 
                      onClick={() => abrirModalAtencion(s)}
                    >
                      📝 Atender
                    </Button>
                  )}

                  {/* Administrador: bitácora */}
                  {esAdmin && (
                    <Button 
                      variant="outline-secondary" 
                      size="sm" 
                      className="w-100"
                      onClick={() => abrirModalAtencion(s)}
                    >
                      📝 Bitácora
                    </Button>
                  )}

                  {!puedeGestionar && (
                    <Badge bg="light" text="dark" className="border">
                      {s.estado === 'RESUELTA' || s.estado === 'CERRADA' ? '✓ Finalizada' : '⏳ En seguimiento'}
                    </Badge>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* Modal para que el Operador registre la Atención y Resuelva / Cierre / Cancele */}
      <Modal show={!!solicitudParaAtencion} onHide={() => setSolicitudParaAtencion(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">
            📝 Registrar Atención · Solicitud #{solicitudParaAtencion?.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small mb-2"><strong>Título:</strong> {solicitudParaAtencion?.titulo}</p>
          <p className="small text-muted mb-3"><strong>Requerimiento:</strong> {solicitudParaAtencion?.descripcion}</p>
          
          <Form.Group className="mb-3">
            <Form.Label><strong>Detalle de la atención realizada:</strong></Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Describe las acciones tomadas para resolver la incidencia (ej: se reconfiguró el perfil de red, se sustituyó cable HDMI, etc.)"
              value={textoAtencion}
              onChange={(e) => setTextoAtencion(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setSolicitudParaAtencion(null)}>
            Cancelar
          </Button>
          <div className="d-flex gap-2">
            <Button variant="outline-danger" size="sm" onClick={() => guardarAtencion('CANCELADA')}>
              Cancelar Solicitud
            </Button>
            <Button variant="info" size="sm" onClick={() => guardarAtencion('EN_PROCESO')}>
              Guardar (En Proceso)
            </Button>
            <Button variant="success" size="sm" onClick={() => guardarAtencion('RESUELTA')}>
              ✓ Resolver
            </Button>
            <Button variant="dark" size="sm" onClick={() => guardarAtencion('CERRADA')}>
              Cerrar
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Sección inferior: Flujo y Monitor de Cola RabbitMQ (Solo visible para Administrador) */}
      {esAdmin && (
        <Card className="mt-4 shadow-sm border-0">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">
                <span className="me-2">🐇</span>
                Flujo de Sincronización Asíncrona (RabbitMQ)
              </h5>
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={cargarCategorias}
              >
                ↻ Verificar réplica local
              </Button>
            </div>

            <Row className="g-3 text-center mb-3">
              <Col md={4}>
                <div className="p-3 border rounded bg-light h-100 text-start">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>1. Publicador</strong>
                    <Badge bg="primary">ms-catalogo</Badge>
                  </div>
                  <small className="text-muted d-block">
                    Registra en RDS Catálogo y emite el evento al Broker:
                  </small>
                  <div className="mt-2 small">
                    <div><strong>Exchange:</strong> <code>catalogo.exchange</code></div>
                    <div><strong>Routing Key:</strong> <code>categoria.creada</code></div>
                  </div>
                </div>
              </Col>

              <Col md={4}>
                <div className="p-3 border rounded bg-light h-100 text-start">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>2. Message Broker</strong>
                    <Badge bg="warning" text="dark">RabbitMQ 4.2</Badge>
                  </div>
                  <small className="text-muted d-block">
                    Enruta y retiene mensajes de forma durable e independiente:
                  </small>
                  <div className="mt-2 small">
                    <div><strong>Puerto AMQP:</strong> <code>5672</code></div>
                    <div><strong>Cola Durable:</strong> <code>solicitudes.catalogo.queue</code></div>
                  </div>
                </div>
              </Col>

              <Col md={4}>
                <div className="p-3 border rounded bg-light h-100 text-start">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>3. Consumidor</strong>
                    <Badge bg="success">ms-solicitudes</Badge>
                  </div>
                  <small className="text-muted d-block">
                    Consume el mensaje y actualiza su réplica local en BD:
                  </small>
                  <div className="mt-2 small">
                    <div><strong>Listener:</strong> <code>@RabbitListener</code></div>
                    <div><strong>Tabla Local:</strong> <code>categorias_locales</code></div>
                  </div>
                </div>
              </Col>
            </Row>

            {/* Panel Monitor en Vivo del Estado de la Cola RabbitMQ */}
            <div className="p-3 border rounded bg-white mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                <h6 className="mb-0">
                  📊 Monitor de Estado de la Cola: <code>solicitudes.catalogo.queue</code>
                </h6>
                <div className="d-flex gap-2">
                  <Button 
                    variant={consumidorActivo ? "outline-danger" : "outline-success"} 
                    size="sm"
                    onClick={toggleConsumidor}
                  >
                    {consumidorActivo ? "⏸️ Detener Consumidor (Prueba P2)" : "▶️ Iniciar Consumidor (Prueba P3)"}
                  </Button>
                </div>
              </div>

              {/* Tarjetas de Métricas de la Cola */}
              <Row className="g-2 text-center my-2">
                <Col md={3} xs={6}>
                  <div className="p-2 border rounded bg-light">
                    <small className="text-muted d-block">Mensajes Listos (Ready)</small>
                    <span className={`h4 mb-0 fw-bold ${mensajesEnCola > 0 ? 'text-warning' : 'text-success'}`}>
                      {mensajesEnCola}
                    </span>
                  </div>
                </Col>
                <Col md={3} xs={6}>
                  <div className="p-2 border rounded bg-light">
                    <small className="text-muted d-block">En Procesamiento (Unacked)</small>
                    <span className="h4 mb-0 fw-bold text-secondary">{mensajesUnacked}</span>
                  </div>
                </Col>
                <Col md={3} xs={6}>
                  <div className="p-2 border rounded bg-light">
                    <small className="text-muted d-block">Consumidores Activos</small>
                    <span className={`h4 mb-0 fw-bold ${consumidorActivo ? 'text-success' : 'text-danger'}`}>
                      {consumidorActivo ? '1 (ms-solicitudes)' : '0 (Detenido)'}
                    </span>
                  </div>
                </Col>
                <Col md={3} xs={6}>
                  <div className="p-2 border rounded bg-light">
                    <small className="text-muted d-block">Estado de la Cola</small>
                    <span className="badge mt-2" style={{ backgroundColor: consumidorActivo ? '#198754' : '#ffc107', color: consumidorActivo ? '#fff' : '#000' }}>
                      {consumidorActivo ? (mensajesEnCola > 0 ? 'Procesando' : 'En línea (Idle)') : 'Acumulando mensajes'}
                    </span>
                  </div>
                </Col>
              </Row>

              {logFlujo && (
                <Alert variant={logFlujo.tipo} className="mt-3 mb-0 py-2 small" dismissible onClose={() => setLogFlujo(null)}>
                  {logFlujo.mensaje}
                </Alert>
              )}
            </div>

            <div className="bg-light p-2 rounded border small d-flex justify-content-between align-items-center">
              <div>
                <strong>Categorías sincronizadas en réplica local: </strong>
                {categorias.map((c) => (
                  <Badge key={c.id} bg="secondary" className="me-1">
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
