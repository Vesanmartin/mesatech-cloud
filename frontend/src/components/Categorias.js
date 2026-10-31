import { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { Table, Spinner, Alert, Card, Form, Button, Row, Col, Badge } from 'react-bootstrap';
import { llamarBFF } from '../api/bffClient';

const FORMULARIO_VACIO = { nombre: '', descripcion: '' };

/**
 * EP2 (solo ROLE_ADMINISTRADOR): crear categorias en Catalogo.
 * Catalogo guarda en su RDS y publica el evento; Solicitudes guarda una copia de forma asincrona.
 * La columna "En Solicitudes" muestra si la copia ya llego (compara con /v1/categorias-disponibles).
 */
function Categorias() {
  const { instance, accounts } = useMsal();
  const [categorias, setCategorias] = useState([]);
  const [disponibles, setDisponibles] = useState([]);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  const cargar = async () => {
    try {
      setCargando(true);
      const [catalogo, copia] = await Promise.all([
        llamarBFF(instance, accounts[0], '/v1/categorias'),
        llamarBFF(instance, accounts[0], '/v1/categorias-disponibles')
      ]);
      setCategorias(catalogo || []);
      setDisponibles((copia || []).map((c) => c.categoriaId));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manejarCambio = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const crear = async (e) => {
    e.preventDefault();
    setError(null);
    setAviso(null);
    try {
      const creada = await llamarBFF(instance, accounts[0], '/v1/categorias', {
        method: 'POST',
        body: JSON.stringify(formulario)
      });
      setFormulario(FORMULARIO_VACIO);
      setAviso(`Categoría "${creada.nombre}" creada (id ${creada.id}). El evento fue publicado; ` +
        'estará disponible en Solicitudes en unos segundos. Presiona "Actualizar" para verificarlo.');
    } catch (err) {
      setError(err.message);
    } finally {
      cargar();
    }
  };

  return (
    <div>
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      {aviso && <Alert variant="success" onClose={() => setAviso(null)} dismissible>{aviso}</Alert>}

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Card.Title>Nueva categoría</Card.Title>
          <Form onSubmit={crear}>
            <Row className="g-3">
              <Col md={4}>
                <Form.Label>Nombre</Form.Label>
                <Form.Control name="nombre" value={formulario.nombre} onChange={manejarCambio} required />
              </Col>
              <Col md={8}>
                <Form.Label>Descripción</Form.Label>
                <Form.Control name="descripcion" value={formulario.descripcion} onChange={manejarCambio} />
              </Col>
            </Row>
            <Button type="submit" variant="primary" className="mt-3">Crear categoría</Button>
          </Form>
        </Card.Body>
      </Card>

      <div className="d-flex justify-content-end mb-2">
        <Button variant="outline-secondary" size="sm" onClick={cargar}>Actualizar</Button>
      </div>

      {cargando ? <Spinner animation="border" /> : (
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>ID</th><th>Nombre</th><th>Descripción</th><th>En Solicitudes</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.nombre}</td>
                <td>{c.descripcion}</td>
                <td>
                  {disponibles.includes(c.id)
                    ? <Badge bg="success">Disponible</Badge>
                    : <Badge bg="warning" text="dark">Pendiente</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

export default Categorias;
