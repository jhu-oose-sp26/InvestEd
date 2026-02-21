--
-- PostgreSQL database dump
--

-- Dumped from database version 15.4 (Debian 15.4-2.pgdg120+1)
-- Dumped by pg_dump version 15.4 (Debian 15.4-2.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: TradeType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TradeType" AS ENUM (
    'BUY',
    'SELL'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.positions (
    id text NOT NULL,
    "userId" text NOT NULL,
    symbol text NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    "averageBuyPrice" numeric(15,2) NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: trades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trades (
    id text NOT NULL,
    "userId" text NOT NULL,
    symbol text NOT NULL,
    type public."TradeType" NOT NULL,
    quantity integer NOT NULL,
    price numeric(15,2) NOT NULL,
    "totalValue" numeric(15,2) NOT NULL,
    "executedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    name text,
    "cashBalance" numeric(15,2) DEFAULT 100000.00 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Data for Name: positions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.positions (id, "userId", symbol, quantity, "averageBuyPrice", "updatedAt") FROM stdin;
\.


--
-- Data for Name: trades; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.trades (id, "userId", symbol, type, quantity, price, "totalValue", "executedAt") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, name, "cashBalance", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: trades trades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: positions_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "positions_userId_idx" ON public.positions USING btree ("userId");


--
-- Name: positions_userId_symbol_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "positions_userId_symbol_key" ON public.positions USING btree ("userId", symbol);


--
-- Name: trades_executedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "trades_executedAt_idx" ON public.trades USING btree ("executedAt");


--
-- Name: trades_symbol_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trades_symbol_idx ON public.trades USING btree (symbol);


--
-- Name: trades_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "trades_userId_idx" ON public.trades USING btree ("userId");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: positions positions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT "positions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trades trades_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT "trades_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

