console.log("Admin.js cargado");


const listaProductos = document.getElementById("listaProductos");
const formEditar = document.getElementById("formEditar");
const btnNuevo = document.getElementById("btnNuevo");
const filtroCategoria = document.getElementById("filtroCategoria");
const totalProductos = document.getElementById("totalProductos");
const productosActivos = document.getElementById("productosActivos");
const productosInactivos = document.getElementById("productosInactivos");
const productosSinStock = document.getElementById("productosSinStock");


let todosLosProductos = [];

function actualizarEstadisticas(){

    if(!totalProductos) return;


    totalProductos.textContent = todosLosProductos.length;

    productosActivos.textContent =
        todosLosProductos.filter(producto => producto.activo).length;


    productosInactivos.textContent =
        todosLosProductos.filter(producto => !producto.activo).length;


    productosSinStock.textContent =
        todosLosProductos.filter(producto => producto.stock <= 0).length;

}

btnNuevo.addEventListener("click", mostrarFormularioNuevo);

/* ============================
   CARGAR PRODUCTOS
============================ */

async function cargarProductos() {

    try {

        const respuesta = await fetch("/api/admin/productos");

        todosLosProductos = await respuesta.json();

        actualizarEstadisticas();

        mostrarProductos();

    } catch (error) {
        console.error(error);
    }
}

/* ============================
   MOSTRAR PRODUCTOS
============================ */

function mostrarProductos() {


    listaProductos.innerHTML = "";


    let productosMostrar = todosLosProductos;



    if (filtroCategoria.value) {


        productosMostrar = todosLosProductos.filter(producto =>

            producto.categoria_id == filtroCategoria.value

        );


    }

    productosMostrar.forEach(producto => {

        listaProductos.innerHTML += `

        <div class="producto-admin">

            <div class="producto-imagen">

                ${producto.imagen_url
                ?
                `<img src="${producto.imagen_url}" alt="${producto.nombre}">`
                :
                `<div class="sin-imagen">📦</div>`
            }

            </div>

            <h3>${producto.nombre}</h3>

            <p>
                <strong>Marca:</strong>
                ${producto.marca || "Sin marca"}
            </p>

            <p>
                <strong>Categoría:</strong>
                ${producto.categoria || "Sin categoría"}
            </p>

            <p>
                <strong>Sabor:</strong>
                ${producto.sabor || "Sin sabor"}
            </p>

            <p>
                <strong>Peso:</strong>
                ${producto.peso_gramos
                ?
                producto.peso_gramos + "g"
                :
                "Sin peso"
            }
            </p>

            <p>
                <strong>Stock:</strong>
                ${producto.stock}
            </p>

            <p>
                <strong>Estado:</strong>
                ${producto.activo
                ?
                "🟢 Activo"
                :
                "🔴 Inactivo"
            }
            </p>

            <p class="producto-precio">
                $${producto.precio}
            </p>

            <button 
            class="btn-editar"
            data-id="${producto.id}">
                ✏️ Editar
            </button>

            <button 
            class="btn-eliminar"
            data-id="${producto.id}">
                🗑️ Eliminar
            </button>

        </div>

        `;

    });

    document
        .querySelectorAll(".btn-eliminar")
        .forEach(boton => {

            boton.addEventListener("click", eliminarProducto);

        });

    document
        .querySelectorAll(".btn-editar")
        .forEach(boton => {

            boton.addEventListener("click", editarProducto);

        });


}



/* ============================
   FILTRO CATEGORIAS
============================ */


async function cargarFiltroCategorias() {

    const respuesta = await fetch("/api/categorias");
    const categorias = await respuesta.json();

    filtroCategoria.innerHTML = `

        <option value="">
            Todas las categorías
        </option>

    `;

    categorias.forEach(categoria => {

        filtroCategoria.innerHTML += `

            <option value="${categoria.id}">
                ${categoria.nombre}
            </option>

        `;

    });

}

filtroCategoria.addEventListener(
    "change",
    mostrarProductos
);

/* ============================
   ELIMINAR
============================ */

async function eliminarProducto(evento) {

    const id = evento.target.dataset.id;

    if (!confirm("¿Eliminar este producto?")) {
        return;
    }

    await fetch(`/api/admin/productos/${id}`, {

        method: "DELETE"

    });

    cargarProductos();

}

/* ============================
   EDITAR
============================ */


async function editarProducto(evento) {


    const id = evento.target.dataset.id;

    const respuesta = await fetch(
        `/api/admin/productos/${id}`
    );

    const producto = await respuesta.json();

    mostrarFormularioEditar(producto);

}

async function mostrarFormularioEditar(producto) {


    const categorias = await (
        await fetch("/api/categorias")
    ).json();

    const marcas = await (
        await fetch("/api/marcas")
    ).json();

    formEditar.innerHTML = `

    <h2>Editar producto</h2>

    <label>Nombre:</label>

    <input id="editNombre" value="${producto.nombre}">

    <label>Marca:</label>

    <select id="editMarca">

        ${marcas.map(marca =>

        `
            <option value="${marca.id}"
            ${marca.id == producto.marca_id ? "selected" : ""}>
                ${marca.nombre}
            </option>
            `

    ).join("")
        }


    </select>

    <label>Categoría:</label>

    <select id="editCategoria">

        ${categorias.map(categoria =>

            `
            <option value="${categoria.id}"
            ${categoria.id == producto.categoria_id ? "selected" : ""}>
                ${categoria.nombre}
            </option>
            `
        ).join("")
        }

    </select>

    <label>Precio:</label>

    <input 
    id="editPrecio"
    type="number"
    value="${producto.precio}">

    <label>Stock:</label>

    <input 
    id="editStock"
    type="number"
    value="${producto.stock}">

    <label>Peso:</label>

    <input
    id="editPeso"
    type="number"
    value="${producto.peso_gramos || ""}">

    <label>Sabor:</label>

    <input
    id="editSabor"
    value="${producto.sabor || ""}">

    <label>Descripción:</label>

    <textarea id="editDescripcion">
    ${producto.descripcion || ""}
    </textarea>

    <label>Imagen URL:</label>

    <input
    id="editImagen"
    value="${producto.imagen_url || ""}">

    <label>

    <input
    id="editActivo"
    type="checkbox"
    ${producto.activo ? "checked" : ""}>

    Publicar producto

    </label>

    <button id="btnGuardarEditar">

        Guardar cambios

    </button>
    `;

    document
        .getElementById("btnGuardarEditar")
        .addEventListener(
            "click",
            () => guardarCambios(producto.id)
        );
}

async function guardarCambios(id) {

    const productoEditado = {

        nombre:
            document.getElementById("editNombre").value,

        categoria_id:
            document.getElementById("editCategoria").value,

        marca_id:
            document.getElementById("editMarca").value,

        precio:
            document.getElementById("editPrecio").value,

        stock:
            document.getElementById("editStock").value,

        peso_gramos:
            document.getElementById("editPeso").value,

        sabor:
            document.getElementById("editSabor").value,

        descripcion:
            document.getElementById("editDescripcion").value,

        imagen_url:
            document.getElementById("editImagen").value,

        activo:
            document.getElementById("editActivo").checked

    };

    const respuesta = await fetch(
        `/api/admin/productos/${id}`,
        {

            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(productoEditado)
        }
    );

    if (respuesta.ok) {

        alert("Producto actualizado correctamente");

        formEditar.innerHTML = "";

        cargarProductos();

    } else {

        alert("Error al actualizar producto");

    }
}

/* ============================
   NUEVO PRODUCTO
============================ */

async function mostrarFormularioNuevo() {

    const categorias =
        await (await fetch("/api/categorias")).json();


    const marcas =
        await (await fetch("/api/marcas")).json();



    formEditar.innerHTML = `


<h2>Agregar producto</h2>


<label>Nombre:</label>
<input id="nuevoNombre">


<label>Marca:</label>

<select id="nuevaMarca">

${marcas.map(marca =>

        `
<option value="${marca.id}">
${marca.nombre}
</option>
`

    ).join("")}

</select>




<label>Categoría:</label>

<select id="nuevaCategoria">

${categorias.map(categoria =>

        `
<option value="${categoria.id}">
${categoria.nombre}
</option>
`

    ).join("")}

</select>



<label>Precio:</label>

<input id="nuevoPrecio" type="number">



<label>Stock:</label>

<input id="nuevoStock" type="number">



<label>Peso:</label>

<input id="nuevoPeso" type="number">



<label>Sabor:</label>

<input id="nuevoSabor">



<label>Descripción:</label>

<textarea id="nuevaDescripcion"></textarea>



<label>Imagen URL:</label>

<input id="nuevaImagen">



<label>

<input id="nuevoActivo" type="checkbox">

Publicar producto

</label>




<button id="btnGuardarNuevo">

Guardar producto

</button>


`;



    document
        .getElementById("btnGuardarNuevo")
        .addEventListener(
            "click",
            agregarProducto
        );


}




async function agregarProducto() {


    const nombre =
        document.getElementById("nuevoNombre").value;



    const producto = {


        nombre,


        slug:
            nombre
                .toLowerCase()
                .replaceAll(" ", "-")
            + "-" + Date.now(),



        categoria_id:
            document.getElementById("nuevaCategoria").value,



        marca_id:
            document.getElementById("nuevaMarca").value,



        precio:
            document.getElementById("nuevoPrecio").value,



        stock:
            document.getElementById("nuevoStock").value,



        peso_gramos:
            document.getElementById("nuevoPeso").value,



        sabor:
            document.getElementById("nuevoSabor").value,



        descripcion:
            document.getElementById("nuevaDescripcion").value,



        imagen_url:
            document.getElementById("nuevaImagen").value,



        activo:
            document.getElementById("nuevoActivo").checked



    };



    const respuesta = await fetch(
        "/api/admin/productos",
        {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(producto)

        }
    );



    if (respuesta.ok) {


        alert("Producto agregado correctamente");


        formEditar.innerHTML = "";


        cargarProductos();


    } else {

        alert("Error al agregar producto");
    }

}

