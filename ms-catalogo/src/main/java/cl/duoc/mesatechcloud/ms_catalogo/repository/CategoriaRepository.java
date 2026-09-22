package cl.duoc.mesatechcloud.ms_catalogo.repository;

import cl.duoc.mesatechcloud.ms_catalogo.model.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {
}