package cl.duoc.mesatechcloud.ms_solicitudes.repository;

import cl.duoc.mesatechcloud.ms_solicitudes.model.CategoriaLocal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CategoriaLocalRepository extends JpaRepository<CategoriaLocal, Long> {

    Optional<CategoriaLocal> findByCategoriaId(Long categoriaId);
}
