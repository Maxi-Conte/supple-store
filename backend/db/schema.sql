--
-- PostgreSQL database dump
--

\restrict zK3uvJRbTaNWmaKWBGsXMhR5q4edCB7BSb7euwEp2Y15mGI1cwB6WFDl7gGhG9U

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: carrito_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carrito_items (
    id integer NOT NULL,
    carrito_id integer NOT NULL,
    producto_id integer NOT NULL,
    cantidad integer NOT NULL,
    variante_id integer NOT NULL
);


ALTER TABLE public.carrito_items OWNER TO postgres;

--
-- Name: carrito_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.carrito_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.carrito_items_id_seq OWNER TO postgres;

--
-- Name: carrito_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.carrito_items_id_seq OWNED BY public.carrito_items.id;


--
-- Name: carritos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carritos (
    id integer NOT NULL,
    usuario_id integer,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    session_token character varying(255)
);


ALTER TABLE public.carritos OWNER TO postgres;

--
-- Name: carritos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.carritos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.carritos_id_seq OWNER TO postgres;

--
-- Name: carritos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.carritos_id_seq OWNED BY public.carritos.id;


--
-- Name: categorias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categorias (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    orden integer DEFAULT 0
);


ALTER TABLE public.categorias OWNER TO postgres;

--
-- Name: categorias_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categorias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categorias_id_seq OWNER TO postgres;

--
-- Name: categorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categorias_id_seq OWNED BY public.categorias.id;


--
-- Name: marcas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.marcas (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.marcas OWNER TO postgres;

--
-- Name: marcas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.marcas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.marcas_id_seq OWNER TO postgres;

--
-- Name: marcas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.marcas_id_seq OWNED BY public.marcas.id;


--
-- Name: orden_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orden_items (
    id integer NOT NULL,
    orden_id integer NOT NULL,
    producto_id integer,
    nombre_producto character varying(255) NOT NULL,
    precio_unitario numeric(12,2) NOT NULL,
    cantidad integer NOT NULL,
    variante_id integer,
    sabor character varying(120),
    peso_gramos integer,
    CONSTRAINT orden_items_cantidad_check CHECK ((cantidad > 0)),
    CONSTRAINT orden_items_precio_unitario_check CHECK ((precio_unitario >= (0)::numeric))
);


ALTER TABLE public.orden_items OWNER TO postgres;

--
-- Name: orden_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orden_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orden_items_id_seq OWNER TO postgres;

--
-- Name: orden_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orden_items_id_seq OWNED BY public.orden_items.id;


--
-- Name: ordenes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ordenes (
    id integer NOT NULL,
    usuario_id integer,
    email_comprador character varying(255),
    total numeric(12,2) NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    mp_preference_id character varying(255),
    mp_payment_id character varying(255),
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ordenes_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'pagado'::character varying, 'rechazado'::character varying])::text[]))),
    CONSTRAINT ordenes_total_check CHECK ((total >= (0)::numeric))
);


ALTER TABLE public.ordenes OWNER TO postgres;

--
-- Name: ordenes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ordenes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ordenes_id_seq OWNER TO postgres;

--
-- Name: ordenes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ordenes_id_seq OWNED BY public.ordenes.id;


--
-- Name: producto_variantes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.producto_variantes (
    id integer NOT NULL,
    producto_id integer NOT NULL,
    sabor character varying(120),
    peso_gramos integer,
    precio numeric(12,2) NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    sku character varying(100),
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT producto_variantes_peso_gramos_check CHECK (((peso_gramos IS NULL) OR (peso_gramos > 0))),
    CONSTRAINT producto_variantes_precio_check CHECK ((precio >= (0)::numeric)),
    CONSTRAINT producto_variantes_stock_check CHECK ((stock >= 0))
);


ALTER TABLE public.producto_variantes OWNER TO postgres;

--
-- Name: producto_variantes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.producto_variantes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.producto_variantes_id_seq OWNER TO postgres;

--
-- Name: producto_variantes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.producto_variantes_id_seq OWNED BY public.producto_variantes.id;


--
-- Name: productos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.productos (
    id integer NOT NULL,
    categoria_id integer NOT NULL,
    nombre character varying(200) NOT NULL,
    slug character varying(200) NOT NULL,
    precio numeric(10,2) NOT NULL,
    stock integer DEFAULT 0,
    dato_destacado character varying(100),
    sabor character varying(100),
    imagen_url text,
    marca_id integer,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    descripcion text,
    peso_gramos integer
);


ALTER TABLE public.productos OWNER TO postgres;

--
-- Name: productos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.productos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.productos_id_seq OWNER TO postgres;

--
-- Name: productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.productos_id_seq OWNED BY public.productos.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash text NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: carrito_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrito_items ALTER COLUMN id SET DEFAULT nextval('public.carrito_items_id_seq'::regclass);


--
-- Name: carritos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carritos ALTER COLUMN id SET DEFAULT nextval('public.carritos_id_seq'::regclass);


--
-- Name: categorias id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias ALTER COLUMN id SET DEFAULT nextval('public.categorias_id_seq'::regclass);


--
-- Name: marcas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marcas ALTER COLUMN id SET DEFAULT nextval('public.marcas_id_seq'::regclass);


--
-- Name: orden_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orden_items ALTER COLUMN id SET DEFAULT nextval('public.orden_items_id_seq'::regclass);


--
-- Name: ordenes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordenes ALTER COLUMN id SET DEFAULT nextval('public.ordenes_id_seq'::regclass);


--
-- Name: producto_variantes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto_variantes ALTER COLUMN id SET DEFAULT nextval('public.producto_variantes_id_seq'::regclass);


--
-- Name: productos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos ALTER COLUMN id SET DEFAULT nextval('public.productos_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Name: carrito_items carrito_items_carrito_variante_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrito_items
    ADD CONSTRAINT carrito_items_carrito_variante_unique UNIQUE (carrito_id, variante_id);


--
-- Name: carrito_items carrito_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrito_items
    ADD CONSTRAINT carrito_items_pkey PRIMARY KEY (id);


--
-- Name: carritos carritos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carritos
    ADD CONSTRAINT carritos_pkey PRIMARY KEY (id);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- Name: categorias categorias_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_slug_key UNIQUE (slug);


--
-- Name: marcas marcas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marcas
    ADD CONSTRAINT marcas_pkey PRIMARY KEY (id);


--
-- Name: marcas marcas_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marcas
    ADD CONSTRAINT marcas_slug_key UNIQUE (slug);


--
-- Name: orden_items orden_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orden_items
    ADD CONSTRAINT orden_items_pkey PRIMARY KEY (id);


--
-- Name: ordenes ordenes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_pkey PRIMARY KEY (id);


--
-- Name: producto_variantes producto_variantes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto_variantes
    ADD CONSTRAINT producto_variantes_pkey PRIMARY KEY (id);


--
-- Name: producto_variantes producto_variantes_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto_variantes
    ADD CONSTRAINT producto_variantes_sku_key UNIQUE (sku);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- Name: productos productos_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_slug_key UNIQUE (slug);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_orden_items_orden_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orden_items_orden_id ON public.orden_items USING btree (orden_id);


--
-- Name: idx_ordenes_usuario_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ordenes_usuario_id ON public.ordenes USING btree (usuario_id);


--
-- Name: idx_producto_variantes_activas; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_producto_variantes_activas ON public.producto_variantes USING btree (producto_id, activo);


--
-- Name: idx_producto_variantes_producto_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_producto_variantes_producto_id ON public.producto_variantes USING btree (producto_id);


--
-- Name: uq_producto_variantes_combinacion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_producto_variantes_combinacion ON public.producto_variantes USING btree (producto_id, COALESCE(lower(TRIM(BOTH FROM sabor)), ''::text), COALESCE(peso_gramos, 0));


--
-- Name: carrito_items carrito_items_carrito_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrito_items
    ADD CONSTRAINT carrito_items_carrito_id_fkey FOREIGN KEY (carrito_id) REFERENCES public.carritos(id);


--
-- Name: carrito_items carrito_items_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrito_items
    ADD CONSTRAINT carrito_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: carrito_items carrito_items_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrito_items
    ADD CONSTRAINT carrito_items_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id) ON DELETE CASCADE;


--
-- Name: carritos carritos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carritos
    ADD CONSTRAINT carritos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: orden_items orden_items_orden_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orden_items
    ADD CONSTRAINT orden_items_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.ordenes(id) ON DELETE CASCADE;


--
-- Name: orden_items orden_items_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orden_items
    ADD CONSTRAINT orden_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE SET NULL;


--
-- Name: orden_items orden_items_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orden_items
    ADD CONSTRAINT orden_items_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.producto_variantes(id) ON DELETE SET NULL;


--
-- Name: ordenes ordenes_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: producto_variantes producto_variantes_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.producto_variantes
    ADD CONSTRAINT producto_variantes_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: productos productos_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id);


--
-- Name: productos productos_marca_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_marca_id_fkey FOREIGN KEY (marca_id) REFERENCES public.marcas(id);


--
-- PostgreSQL database dump complete
--

\unrestrict zK3uvJRbTaNWmaKWBGsXMhR5q4edCB7BSb7euwEp2Y15mGI1cwB6WFDl7gGhG9U

