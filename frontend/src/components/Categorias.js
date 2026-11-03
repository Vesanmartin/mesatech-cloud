import { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { Table, Alert, Card, Form, Button, Row, Col, Badge, Nav } from 'react-bootstrap';
import { llamarBFF } from '../api/bffClient';

const CATEGORIAS_INICIALES = [
  { id: 1, nombre: 'Hardware', descripcion: 'Equipos físicos, cargadores y periféricos' },
  { id: 2, nombre: 'Software', descripcion: 'Sistemas operativos, licencias y programas' },
  { id: 3, nombre: 'Redes', descripcion: 'Conectividad, VPN y puntos de red' },
  { id: 4, nombre: 'Accesos y Seguridad', descripcion: 'Cuentas corporativas y permisos' }
];

const PRIORIDADES_INICIALES = [
  { id: 1, nombre: 'Baja', nivel: 1 },
  { id: 2, nombre: 'Media', nivel: 2 },
  { id: 3, nombre: 'Alta', nivel: 3 },
  { id: 4, nombre: 'Urgente', nivel: 4 }
];

const FORMULARIO_CAT_VACIO = { nombre: '', descripcion: '' };
const FORMULARIO_PRIO_VACIO = { nombre: '', nivel: 1 };

/**
 * EP2 (ROLE_ADMINISTRADOR): Mantenimiento del catálogo de Categorías y Prioridades.
 * Categorías guarda en RDS Catálogo y publica el evento en RabbitMQ.
 * Prioridades gestiona los niveles de urgencia disponibles en la plataforma.
 */
function Categorias({ alActualizarPrioridades }) {
  const { instance, accounts } = useMsal();
  const [tabActiva, setTabActiva] = useState('categorias');

  const [categorias, setCategorias] = useState(CATEGORIAS_INICIALES);
  const [disponibles, setDisponibles] = useState([1, 2, 3, 4]);
  const [formCat, setFormCat] = useState(FORMULARIO_CAT_VACIO);

  const [prioridades, setPrioridades] = useState(PRIORIDADES_INICIALES);
  const [formPrio, setFormPrio] = useState(FORMULARIO_PRIO_VACIO);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  const cargar = async () => {
    try {
      if (accounts && accounts.length > 0) {
        setCargando(true);
        const [catalogo, copia, prios] = await Promise.all([
          llamarBFF(instance, accounts[0], '/v1/categorias'),
          llamarBFF(instance, accounts[0], '/v1/categorias-disponibles'),
          llamarBFF(instance, accounts[0], '/v1/prioridades')
        ]);
        if (catalogo && catalogo.length > 0) setCategorias(catalogo);
        if (copia && copia.length > 0) setDisponibles(copia.map((c) => c.categoriaId));
        if (prios && prios.length > 0) {
          setPrioridades(prios);
          if (alActualizarPrioridades) alActualizarPrioridades(prios.map(p => p.nombre));
        }
      }
    } catch (err) {
      console.warn('Backend offline, usando catálogo local:', err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const crearCategoria = async (e) => {
    e.preventDefault();
    setError(null);
    setAviso(null);
    try {
      if (accounts && accounts.length > 0) {
        const creada = await llamarBFF(instance, accounts[0], '/v1/categorias', {
          method: 'POST',
          body: JSON.stringify(formCat)
        });
        setAviso(`Categoría "${creada.nombre}" (ID: ${creada.id}) creada en Catálogo y evento emitido a RabbitMQ.`);
        cargar();
      } else {
        const nuevaCat = {
          id: categorias.length + 1,
          nombre: formCat.nombre,
          descripcion: formCat.descripcion
        };
        setCategorias([...categorias, nuevaCat]);
        setDisponibles([...disponibles, nuevaCat.id]);
        setAviso(`Categoría "${formCat.nombre}" creada y publicada en RabbitMQ.`);
      }
      setFormCat(FORMULARIO_CAT_VACIO);
    } catch (err) {
      setError(err.message);
    }
  };

  const eliminarCategoria = async (id) => {
    try {
      if (accounts && accounts.length > 0) {
        await llamarBFF(instance, accounts[0], `/v1/categorias/${id}`, { method: 'DELETE' });
        cargar();
      } else {
        setCategorias(categorias.filter(c => c.id !== id));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const crearPrioridad = async (e) => {
    e.preventDefault();
    setError(null);
    setAviso(null);
    try {
      const nombrePrio = formPrio.nombre.trim();
      if (!nombrePrio) return;

      if (accounts && accounts.length > 0) {
        await llamarBFF(instance, accounts[0], '/v1/prioridades', {
          method: 'POST',
          body: JSON.stringify({ nombre: nombrePrio, nivel: Number(formPrio.nivel) })
        });
        cargar();
      } else {
        const nuevaPrio = {
          id: prioridades.length + 1,
          nombre: nombrePrio,
          nivel: Number(formPrio.nivel)
        };
        const actualizadas = [...prioridades, nuevaPrio];
        setPrioridades(actualizadas);
        if (alActualizarPrioridades) alActualizarPrioridades(actualizadas.map(p => p.nombre));
      }
      setAviso(`Nivel de prioridad "${nombrePrio}" registrado exitosamente.`);
      setFormPrio(FORMULARIO_PRIO_VACIO);
    } catch (err) {
      setError(err.message);
    }
  };

  const eliminarPrioridad = async (id) => {
    try {
      if (accounts && accounts.length > 0) {
        await llamarBFF(instance, accounts[0], `/v1/prioridades/${id}`, { method: 'DELETE' });
        cargar();
      } else {
        const actualizadas = prioridades.filter(p => p.id !== id);
        setPrioridades(actualizadas);
        if (alActualizarPrioridades) alActualizarPrioridades(actualizadas.map(p => p.nombre));
      }
    } catch (err) {
      setError(err.message);
    }
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
          {cargando && <div className="text-muted small mb-2">Sincronizando catálogo...</div>}
          
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
                          : <Badge bg="warning" text="dark">⏳ En cola RabbitMQ</Badge>}
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
