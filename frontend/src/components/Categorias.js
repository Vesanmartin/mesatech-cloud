import { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { Table, Alert, Card, Form, Button, Row, Col, Badge, Nav } from 'react-bootstrap';
import { llamarBFF } from '../api/bffClient';

const FORMULARIO_CAT_VACIO = { nombre: '', descripcion: '' };
const FORMULARIO_PRIO_VACIO = { nombre: '', nivel: 1 };

/**
 * EP2 (ROLE_ADMINISTRADOR): mantenimiento de Categorias y Prioridades (todo desde el backend).
 * - Crear categoria: ms-catalogo la guarda en RDS Catalogo y publica CATEGORIA_CREADA en RabbitMQ.
 * - La columna "Sincronización" compara GET /v1/categorias (original)
 *   con GET /v1/categorias-disponibles (copia local de ms-solicitudes).
 * - Si RabbitMQ no confirma, el backend responde 503: la categoria SI quedo guardada, pero no llegara a Solicitudes.
 */
function Categorias() {
  const { instance, accounts } = useMsal();
  const [tabActiva, setTabActiva] = useState('categorias');

  const [categorias, setCategorias] = useState([]);
  const [disponibles, setDisponibles] = useState([]);
  const [formCat, setFormCat] = useState(FORMULARIO_CAT_VACIO);

  const [prioridades, setPrioridades] = useState([]);
  const [formPrio, setFormPrio] = useState(FORMULARIO_PRIO_VACIO);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  const llamar = (path, options) => llamarBFF(instance, accounts[0], path, options);

  const cargar = async () => {
    if (accounts.length === 0) return;
    setCargando(true);
    try {
      const [catalogo, copia, prios] = await Promise.all([
        llamar('/v1/categorias'),
        llamar('/v1/categorias-disponibles'),
        llamar('/v1/prioridades')
      ]);
      setCategorias(catalogo || []);
      setDisponibles((copia || []).map((c) => c.categoriaId));
      setPrioridades(prios || []);
    } catch (err) {
      setError(`No se pudo cargar el catálogo: ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  const crearCategoria = async (e) => {
    e.preventDefault();
    setError(null);
    setAviso(null);
    try {
      const creada = await llamar('/v1/categorias', {
        method: 'POST',
        body: JSON.stringify(formCat)
      });
      // 201 = guardada en RDS Catalogo y RabbitMQ confirmo el evento (aun falta que Solicitudes la procese)
      setAviso(`Categoría "${creada.nombre}" (ID: ${creada.id}) guardada en Catálogo y evento confirmado por RabbitMQ. Presiona ↻ para ver cuándo llega a Solicitudes.`);
      setFormCat(FORMULARIO_CAT_VACIO);
    } catch (err) {
      // 503 (P7): el mensaje del backend explica que quedo guardada sin evento
      setError(err.message);
    }
    cargar();
  };

  const eliminarCategoria = async (id) => {
    try {
      await llamar(`/v1/categorias/${id}`, { method: 'DELETE' });
    } catch (err) {
      setError(err.message);
    }
    cargar();
  };

  const crearPrioridad = async (e) => {
    e.preventDefault();
    setError(null);
    setAviso(null);
    const nombrePrio = formPrio.nombre.trim();
    if (!nombrePrio) return;
    try {
      await llamar('/v1/prioridades', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombrePrio, nivel: Number(formPrio.nivel) })
      });
      setAviso(`Nivel de prioridad "${nombrePrio}" registrado.`);
      setFormPrio(FORMULARIO_PRIO_VACIO);
    } catch (err) {
      setError(err.message);
    }
    cargar();
  };

  const eliminarPrioridad = async (id) => {
    try {
      await llamar(`/v1/prioridades/${id}`, { method: 'DELETE' });
    } catch (err) {
      setError(err.message);
    }
    cargar();
  };

  return (
    <div>
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      {aviso && <Alert variant="success" onClose={() => setAviso(null)} dismissible>{aviso}</Alert>}

      <Card className="mb-4 shadow-sm border-0">
        <Card.Header className="bg-light py-2">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <strong>📦 Mantenimiento de Catálogo (Gestión de Administrador)</strong>
            <Badge bg="primary">Control Exclusivo Administrador</Badge>
          </div>
          <Nav variant="tabs" activeKey={tabActiva} onSelect={(k) => setTabActiva(k)}>
            <Nav.Item>
              <Nav.Link eventKey="categorias">
                📁 Categorías de Atención ({categorias.length})
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="prioridades">
                ⚡ Niveles de Prioridad ({prioridades.length})
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Card.Header>

        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="text-muted small">{cargando ? 'Consultando catálogo...' : ''}</span>
            <Button variant="outline-secondary" size="sm" onClick={cargar} title="Volver a consultar Catálogo y la copia de Solicitudes">↻ Actualizar</Button>
          </div>
          
          {tabActiva === 'categorias' && (
            <>
              <Form onSubmit={crearCategoria} className="mb-3">
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Label>Nombre de Categoría</Form.Label>
                    <Form.Control 
                      value={formCat.nombre} 
                      onChange={(e) => setFormCat({ ...formCat, nombre: e.target.value })} 
                      placeholder="Ej: Impresoras y Escáneres"
                      required 
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Descripción del Servicio</Form.Label>
                    <Form.Control 
                      value={formCat.descripcion} 
                      onChange={(e) => setFormCat({ ...formCat, descripcion: e.target.value })} 
                      placeholder="Ej: Soporte de tóner, atascos y calibración"
                    />
                  </Col>
                  <Col md={2} className="d-flex align-items-end">
                    <Button type="submit" variant="primary" className="w-100">
                      + Agregar
                    </Button>
                  </Col>
                </Row>
              </Form>

              <Table striped bordered hover responsive size="sm" className="bg-white">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '60px' }}>ID</th>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th style={{ width: '180px' }}>Sincronización</th>
                    <th style={{ width: '70px' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.map((c) => (
                    <tr key={c.id}>
                      <td><strong>#{c.id}</strong></td>
                      <td>{c.nombre}</td>
                      <td>{c.descripcion || <span className="text-muted">Sin descripción</span>}</td>
                      <td>
                        {disponibles.includes(c.id)
                          ? <Badge bg="success">✓ Disponible en Solicitudes</Badge>
                          : <Badge bg="warning" text="dark">Pendiente en Solicitudes</Badge>}
                      </td>
                      <td className="text-center">
                        <Button variant="outline-danger" size="sm" onClick={() => eliminarCategoria(c.id)} title="Eliminar categoría">
                          🗑️
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}

          {tabActiva === 'prioridades' && (
            <>
              <Form onSubmit={crearPrioridad} className="mb-3">
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Label>Nombre de Prioridad</Form.Label>
                    <Form.Control 
                      value={formPrio.nombre} 
                      onChange={(e) => setFormPrio({ ...formPrio, nombre: e.target.value })} 
                      placeholder="Ej: Crítica, Urgente, Normal..."
                      required 
                    />
                  </Col>
                  <Col md={4}>
                    <Form.Label>Nivel de Escalamiento</Form.Label>
                    <Form.Select 
                      value={formPrio.nivel} 
                      onChange={(e) => setFormPrio({ ...formPrio, nivel: e.target.value })}
                    >
                      <option value="1">1 - Baja / Rutinaria</option>
                      <option value="2">2 - Media / Normal</option>
                      <option value="3">3 - Alta / Requerida</option>
                      <option value="4">4 - Urgente / Crítica</option>
                    </Form.Select>
                  </Col>
                  <Col md={2} className="d-flex align-items-end">
                    <Button type="submit" variant="success" className="w-100">
                      + Guardar
                    </Button>
                  </Col>
                </Row>
              </Form>

              <Table striped bordered hover responsive size="sm" className="bg-white">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '60px' }}>ID</th>
                    <th>Nivel de Prioridad</th>
                    <th>Nivel Escalamiento</th>
                    <th style={{ width: '70px' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {prioridades.map((p) => (
                    <tr key={p.id}>
                      <td><strong>#{p.id}</strong></td>
                      <td>
                        <Badge bg={p.nombre === 'Urgente' || p.nombre === 'Crítica' ? 'danger' : p.nombre === 'Alta' ? 'warning' : p.nombre === 'Media' ? 'primary' : 'secondary'} text={p.nombre === 'Alta' ? 'dark' : 'white'}>
                          {p.nombre}
                        </Badge>
                      </td>
                      <td>Nivel {p.nivel}</td>
                      <td className="text-center">
                        <Button variant="outline-danger" size="sm" onClick={() => eliminarPrioridad(p.id)} title="Eliminar prioridad">
                          🗑️
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default Categorias;