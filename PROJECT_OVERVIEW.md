# FloatChat Project Overview

## What Problem FloatChat Solves

Oceanographic data is valuable, but it is usually difficult to explore. Researchers and other users often need to understand database fields, geographic boundaries, time formats, float identifiers, and scientific variables before they can ask even a simple question. FloatChat addresses this gap by allowing a person to ask about ARGO ocean observations in ordinary language. Instead of forcing the user to think like a database designer, it lets the user think like an ocean observer: they can ask about temperature, salinity, depth, location, time, or nearby floats and receive a visual, understandable response.

The project is designed around the idea that access to scientific data should not be limited by the complexity of the system that stores it. A user should be able to ask what was observed in a region during a period and see the relevant evidence on a map, in charts, and in a concise explanation. FloatChat therefore solves both a discovery problem and an interpretation problem. It helps users find the right records and then helps them understand what those records show.

## How the Solution Works

FloatChat turns a natural-language question into a structured data request. The question first enters a question-first interface that keeps the interaction simple and focused. The language is then interpreted as an intent: the type of question, the scientific variable, the location, the time range, and any other constraints are identified. The structured intent is validated and translated into the form required by the ARGO data layer. The backend retrieves the matching records from the ARGO dataset, and the frontend presents the result as evidence rather than as an unexplained number.

The result can include a spatial view of float observations, temporal patterns, depth distribution, summary statistics, and follow-up directions. This makes the system conversational at the entry point while remaining scientifically grounded at the point where it produces an answer. The question may be expressed naturally, but the answer is based on actual records and deterministic filters.

## Architecture And Its Design

The architecture is divided into a presentation layer, an orchestration layer, a data layer, and an explanation layer. The frontend is responsible for the conversation-like experience, the loading states, the intent context shown to the user, and the visual presentation of the returned data. It does not own the scientific truth. The backend is responsible for validating requests, resolving locations, applying data filters, querying ARGO records, calculating summaries, and returning consistent results. This separation keeps the user experience expressive while keeping data access controlled and reproducible.

The ARGO data layer is intentionally read-oriented. It exposes focused capabilities such as regional and time-based queries, vertical profiles, nearest-float discovery, data availability, active-float lookup, and regional statistics. Each capability has a clear purpose. The application does not ask a language model to search freely through the database or invent an answer. Instead, language is converted into a bounded request, and the data service executes that request against known tables and known fields.

Geographic understanding is handled as its own concern. Named seas, gulfs, and ocean regions can be resolved through local geographic data, while cities, ports, and landmarks can use the geocoding service. A location is converted into a geographic boundary or a center-and-radius description before the data query is executed. This allows the rest of the system to work with stable geographic parameters rather than relying on vague names during data retrieval.

The explanation layer is placed after the data layer. It receives summarized results and translates those results into readable language. It does not decide which records are correct, which region should be searched, or what the database means. The project expresses this boundary directly: FloatChat logic produces the truth, while the language model explains the truth. This is an important architectural choice because it keeps explanation flexible without allowing generated language to control scientific computation.

## What The Intent Parser Is

The intent parser is the part of FloatChat that understands what a user is asking for. An intent is a structured description of the request. It can identify whether the user wants a spatial and temporal query, a vertical profile, a nearest-float search, a data-availability check, or an aggregation. It can also identify variables such as temperature, salinity, or pressure, along with dates, regions, coordinates, float identifiers, limits, and aggregation preferences.

In the current implementation, the main natural-language intent parser is an AI model hosted through a Hugging Face service. The backend sends the user question to that service and receives a structured response. The response is then normalized, checked against allowed intent types and variables, and mapped to one of the backend's known data capabilities. The parser does not directly answer the user. It proposes a structured understanding of the question, after which the application validates and executes that understanding.

The parser is therefore AI-assisted, but it is not an autonomous agent. It does not plan a chain of actions independently, maintain an open-ended goal, operate tools without boundaries, or decide whether its own answer is correct. It performs a focused transformation: natural language becomes structured intent. The rest of the system supplies validation, routing, database access, visualization, and controlled explanation.

## What Is Intelligent About FloatChat

The intelligence in FloatChat is not limited to calling an AI model. It comes from the cooperation of several bounded capabilities. The system recognizes the meaning of a question, understands scientific vocabulary, normalizes different ways of expressing the same field, resolves geographic language, chooses the appropriate data operation, checks whether the resulting intent is usable, and presents the evidence in a form a person can inspect. The intelligent behavior is thus a complete interpretation pipeline rather than a single generated sentence.

The system also separates uncertainty from authority. The language model can help interpret what the user meant, but it is not allowed to redefine the dataset or fabricate missing measurements. Validation rules constrain the accepted variables and query types. The data service determines the returned values. The visual layer exposes the records and their context. The explanation model works from summarized measurements instead of receiving unrestricted authority over the answer. This combination makes the application more trustworthy than a system that treats generated text as the source of truth.

For the current local demonstration, the exact sample question can use a direct demo path. That path bypasses the external intent parser and sends a fixed, validated request for the single seeded ARGO sample. This is useful for demonstrating the complete experience without depending on an external model service. It does not replace the general intent-parser architecture; it provides a controlled example of the same question-to-data-to-visualization flow.

## How This Could Exist Before Agentic AI

FloatChat does not depend on the idea of agentic AI. Its architecture belongs to an earlier and still very useful generation of intelligent software: a supervised pipeline composed of specialized services. Before the recent popularity of AI agents, systems commonly combined natural-language processing, rules, validation, search, databases, and visualization in a fixed sequence. FloatChat follows that pattern.

In a pre-agentic form, the system would still accept a question, classify its intent, extract entities such as dates and locations, resolve those entities into database parameters, run a deterministic query, and display the result. The language model could be replaced by a traditional classifier, a statistical named-entity recognizer, a set of carefully designed parsing rules, or a hybrid of these approaches. The architecture would remain the same because the important design is the boundary between interpretation and execution.

This makes FloatChat an example of applied AI rather than an autonomous agent. Its value comes from making a difficult scientific system easier to use while keeping the path from question to evidence understandable. The project uses modern language models where they are helpful, but its core principles are older, durable engineering principles: separate responsibilities, validate inputs, constrain actions, preserve the source of truth, and make results visible to the person asking the question.

## Current Project Character

FloatChat is best understood as a conversational scientific exploration interface for ARGO ocean data. It combines natural-language access, deterministic data services, geographic reasoning, visual analytics, and optional AI-generated explanation. Its architecture is intentionally hybrid: AI helps interpret and communicate, while the application and database remain responsible for what is actually computed and shown.
