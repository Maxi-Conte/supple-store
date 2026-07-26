const express = require('express');
const db = require('../db/database');

const router = express.Router();


// ==========================================
// CATEGORÍAS
// GET /api/categorias
// ==========================================

router.get('/categorias', async (req, res) => {

    try {

        const resultado = await db.query(
            `
            SELECT id, nombre, slug
            FROM categorias
            ORDER BY orden ASC
            `
        );

        res.json(resultado.rows);


    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Error al obtener categorías."
        });

    }

});


// ==========================================
// MARCAS
// GET /api/marcas
// ==========================================

router.get('/marcas', async (req, res) => {

    try {

        const resultado = await db.query(
            `
            SELECT id, nombre, slug
            FROM marcas
            ORDER BY nombre ASC
            `
        );

        res.json(resultado.rows);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Error al obtener marcas."
        });

    }

});



// ==========================================
// PRODUCTOS PÚBLICOS
// GET /api/productos
// ==========================================

router.get('/productos', async (req, res) => {

    try {

        const { categoria, buscar } = req.query;


        let consulta = `
         SELECT
    p.id,
    p.nombre,
    p.slug,
    p.precio,
    p.stock,
    p.sabor,
    p.imagen_url,
    p.dato_destacado,
    p.descripcion,
    p.peso_gramos,
    c.nombre AS categoria,
    c.slug AS categoria_slug
    FROM productos p

    LEFT JOIN categorias c
    ON c.id = p.categoria_id

    WHERE p.activo = true
        `;


        const parametros = [];


        if (categoria) {

            parametros.push(categoria);

            consulta += `
                AND c.slug = $${parametros.length}
            `;

        }


        if (buscar) {

            parametros.push(`%${buscar}%`);

            consulta += `
                AND LOWER(p.nombre)
                LIKE LOWER($${parametros.length})
            `;

        }


        consulta += `
            ORDER BY p.nombre ASC
        `;



        const resultado = await db.query(
            consulta,
            parametros
        );


        res.json(resultado.rows);



    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Error al obtener productos."
        });

    }

});




// ==========================================
// DETALLE DE PRODUCTO
// GET /api/productos/:slug
// ==========================================

router.get('/productos/:slug', async (req, res) => {


    try {


        const resultado = await db.query(
            `
            SELECT
                p.*,
                c.nombre AS categoria,
                c.slug AS categoria_slug

            FROM productos p

            LEFT JOIN categorias c
                ON c.id = p.categoria_id

            WHERE p.slug = $1
            AND p.activo = true
            `,
            [
                req.params.slug
            ]
        );



        if (resultado.rows.length === 0) {

            return res.status(404).json({
                error: "Producto no encontrado."
            });

        }


        res.json(resultado.rows[0]);



    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Error al obtener producto."
        });

    }


});




// ==========================================
// ADMIN - LISTAR TODOS LOS PRODUCTOS
// GET /api/admin/productos
// ==========================================

router.get('/admin/productos', async (req, res) => {


    try {


        const resultado = await db.query(
            `
            SELECT

                p.id,
                p.nombre,
                p.slug,
                p.descripcion,
                p.precio,
                p.stock,
                p.imagen_url,
                p.dato_destacado,
                p.sabor,
                p.activo,
                p.categoria_id,

                c.nombre AS categoria


            FROM productos p


            LEFT JOIN categorias c

                ON c.id = p.categoria_id



            ORDER BY p.id ASC

            `
        );


        res.json(resultado.rows);



    } catch (err) {


        console.error(err);


        res.status(500).json({

            error: "Error al obtener productos del administrador."

        });


    }


});




// ==========================================
// ADMIN - OBTENER PRODUCTO POR ID
// GET /api/admin/productos/:id
// ==========================================

router.get('/admin/productos/:id', async (req, res) => {


    try {


        const resultado = await db.query(
            `
            SELECT

                p.id,
                p.nombre,
                p.slug,
                p.descripcion,
                p.precio,
                p.stock,
                p.imagen_url,
                p.dato_destacado,
                p.sabor,
                p.activo,
                p.categoria_id,

                c.nombre AS categoria


            FROM productos p


            LEFT JOIN categorias c

                ON c.id = p.categoria_id



            WHERE p.id = $1

            `,
            [
                req.params.id
            ]
        );



        if (resultado.rows.length === 0) {

            return res.status(404).json({

                error: "Producto no encontrado."

            });

        }



        res.json(resultado.rows[0]);



    } catch (err) {


        console.error(err);


        res.status(500).json({

            error: "Error al obtener producto."

        });


    }


});




// ==========================================
// ADMIN - CREAR PRODUCTO
// POST /api/admin/productos
// ==========================================

router.post('/admin/productos', async (req, res) => {


    try {


        const {

            categoria_id,
            nombre,
            slug,
            descripcion,
            precio,
            stock,
            imagen_url,
            dato_destacado,
            sabor,
            activo


        } = req.body;



        const resultado = await db.query(

            `
            INSERT INTO productos

            (
                categoria_id,
                nombre,
                slug,
                descripcion,
                precio,
                stock,
                imagen_url,
                dato_destacado,
                sabor,
                activo
            )


            VALUES

            ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)


            RETURNING *

            `,


            [

                categoria_id,
                nombre,
                slug,
                descripcion,
                precio,
                stock,
                imagen_url,
                dato_destacado,
                sabor,
                activo

            ]

        );



        res.status(201).json({

            mensaje: "Producto creado correctamente",

            producto: resultado.rows[0]

        });



    } catch (err) {


        console.error(err);


        res.status(500).json({

            error: "Error al crear producto."

        });


    }


});




// ==========================================
// ADMIN - EDITAR PRODUCTO
// PUT /api/admin/productos/:id
// ==========================================

router.put('/admin/productos/:id', async (req, res) => {


    try {


        const {

            nombre,
            categoria_id,
            descripcion,
            precio,
            stock,
            imagen_url,
            dato_destacado,
            sabor,
            activo


        } = req.body;



        const resultado = await db.query(

            `
            UPDATE productos

            SET

                nombre = $1,
                categoria_id = $2,
                descripcion = $3,
                precio = $4,
                stock = $5,
                imagen_url = $6,
                dato_destacado = $7,
                sabor = $8,
                activo = $9


            WHERE id = $10


            RETURNING *

            `,


            [

                nombre,
                categoria_id,
                descripcion,
                precio,
                stock,
                imagen_url,
                dato_destacado,
                sabor,
                activo,
                req.params.id

            ]

        );



        if (resultado.rows.length === 0) {


            return res.status(404).json({

                error: "Producto no encontrado."

            });


        }



        res.json({

            mensaje: "Producto actualizado correctamente",

            producto: resultado.rows[0]

        });



    } catch (err) {


        console.error(err);


        res.status(500).json({

            error: "Error al actualizar producto."

        });


    }


});




// ==========================================
// ADMIN - ELIMINAR PRODUCTO
// DELETE /api/admin/productos/:id
// ==========================================

router.delete('/admin/productos/:id', async (req, res) => {


    try {


        const resultado = await db.query(

            `
            DELETE FROM productos

            WHERE id = $1

            RETURNING *

            `,

            [
                req.params.id
            ]

        );



        if (resultado.rows.length === 0) {


            return res.status(404).json({

                error: "Producto no encontrado."

            });


        }



        res.json({

            mensaje: "Producto eliminado correctamente"

        });



    } catch (err) {


        console.error(err);


        res.status(500).json({

            error: "Error al eliminar producto."

        });


    }


});



module.exports = router;
