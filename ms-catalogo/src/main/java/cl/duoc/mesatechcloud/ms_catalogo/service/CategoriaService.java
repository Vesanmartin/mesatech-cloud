package cl.duoc.mesatechcloud.ms_catalogo.service;

import cl.duoc.mesatechcloud.ms_catalogo.event.CategoriaCreadaEvento;
import cl.duoc.mesatechcloud.ms_catalogo.event.CategoriaPublisher;
import cl.duoc.mesatechcloud.ms_catalogo.exception.PublicacionFallidaException;
import cl.duoc.mesatechcloud.ms_catalogo.model.Categoria;
import cl.duoc.mesatechcloud.ms_catalogo.repository.CategoriaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class CategoriaService {

    private static final Logger log = LoggerFactory.getLogger(CategoriaService.class);

    private final CategoriaRepository categoriaRepository;
    private final CategoriaPublisher categoriaPublisher;

    public CategoriaService(CategoriaRepository categoriaRepository, CategoriaPublisher categoriaPublisher) {
        this.categoriaRepository = categoriaRepository;
        this.categoriaPublisher = categoriaPublisher;
    }

    public List<Categoria> listar() {
        return categoriaRepository.findAll();
    }

    /**
     * EP2: paso 1 guardar en RDS Catalogo; paso 2 publicar el evento CATEGORIA_CREADA.
     * Son operaciones SEPARADAS: si el paso 2 falla, la categoria YA quedo guardada y
     * Solicitudes no recibe la copia (inconsistencia documentada en la prueba P7).
     */
    public Categoria crear(Categoria categoria) {
        categoria.setId(null); // siempre crea un registro nuevo
        Categoria guardada = categoriaRepository.save(categoria);
        log.info("Categoria guardada en RDS Catalogo: categoriaId={} nombre={}", guardada.getId(), guardada.getNombre());

        CategoriaCreadaEvento evento = new CategoriaCreadaEvento(
                UUID.randomUUID().toString(),
                CategoriaCreadaEvento.TIPO,
                Instant.now().toString(),
                guardada.getId(),
                guardada.getNombre());

        try {
            categoriaPublisher.publicar(evento);
        } catch (AmqpException e) {
            log.error("Fallo de publicacion: categoriaId={} eventId={} causa={}",
                    guardada.getId(), evento.eventId(), e.getMessage());
            throw new PublicacionFallidaException(guardada, evento.eventId(), e);
        }
        return guardada;
    }

    // Actualizar y eliminar mantienen el comportamiento de la EP1 (sin eventos, segun la pauta)
    public Categoria actualizar(Long id, Categoria categoria) {
        categoria.setId(id);
        return categoriaRepository.save(categoria);
    }

    public void eliminar(Long id) {
        categoriaRepository.deleteById(id);
    }
}
