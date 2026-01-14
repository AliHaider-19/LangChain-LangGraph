import { pipeline } from "@xenova/transformers";
import { CloudClient } from "chromadb";
import { config } from "dotenv";
config();

const client = new CloudClient({
  apiKey: process.env.CHROMA_API_KEY,
  tenant: "b3c13a1f-f7de-4336-b2ca-0dadfc8f6ae9",
  database: "SmartNotesSearch",
});

export const notes = await client.getOrCreateCollection({
  name: "notes_collection",
  embeddingFunction: null,
});

let embedder;

const getEmbedder = async () => {
  if (!embedder) {
    console.log("🔄 Loading embedding model...");
    embedder = await pipeline("feature-extraction", "Xenova/bge-base-en-v1.5");
    console.log("✅ Embedding model ready");
  }
  return embedder;
};

export const embedText = async (texts) => {
  const model = await getEmbedder();

  const inputTexts = (Array.isArray(texts) ? texts : [texts])
    .map((t) => t.trim())
    .filter(Boolean);

  if (!inputTexts.length) return [];

  const embeddings = await model(inputTexts, {
    pooling: "mean",
    normalize: true,
  });

  // Convert tensor to array of embeddings
  return embeddings.tolist();
};

export const addNotes = async (notesArray) => {
  if (!notesArray?.length) return;

  const ids = [];
  const documents = [];
  const metadatas = [];

  for (const note of notesArray) {
    if (!note?.content?.trim()) continue;

    ids.push(note.id);
    documents.push(`${note.title}. ${note.content}`);
    metadatas.push({ title: note.title });
  }

  if (!documents.length) return;

  const embeddings = await embedText(documents);

  await notes.upsert({
    ids,
    documents,
    metadatas,
    embeddings,
  });
};

export const searchNotes = async (query, limit = 5) => {
  const [queryEmbedding] = await embedText(query);

  if (!queryEmbedding) return [];

  const result = await notes.query({
    queryEmbeddings: [queryEmbedding],
    nResults: limit,
  });

  // Flatten for frontend
  return result.documents[0]
    .map((doc, i) => ({
      content: doc,
      metadata: result.metadatas[0][i],
      distance: result.distances[0][i],
      id: result.ids[0][i],
    }))
    .filter((item) => item.distance < 1.2);
};
export const getAllDocuments = async () => {
  try {
    const result = await notes.get();

    if (!result.documents?.length) return [];

    return result.documents.map((doc, i) => ({
      content: doc,
      metadata: result.metadatas[i],
      id: result.ids[i],
    }));
  } catch (error) {
    console.error("Error fetching all notes:", error);
    return [];
  }
};

const notesData = [
  {
    id: "1",
    title: "Node.js Basics",
    content: "Node.js is a JavaScript runtime built on Chrome V8 engine.",
  },
  {
    id: "2",
    title: "ChromaDB Overview",
    content:
      "ChromaDB is a vector database used for semantic search and AI apps.",
  },
  {
    id: "3",
    title: "Embeddings Explained",
    content:
      "Embeddings convert text into numerical vectors for similarity search.",
  },
  {
    id: "4",
    title: "React Performance",
    content:
      "Use memoization and proper state management to optimize React apps.",
  },
  {
    id: "5",
    title: "Docker Introduction",
    content:
      "Docker helps package applications into containers for easy deployment.",
  },
  {
    id: "6",
    title: "SQL vs NoSQL",
    content:
      "SQL databases use tables while NoSQL databases are schema flexible.",
  },
  {
    id: "7",
    title: "LangChain Basics",
    content: "LangChain helps connect LLMs with external data sources.",
  },
  {
    id: "8",
    title: "Semantic Search",
    content: "Semantic search finds meaning instead of exact keyword matches.",
  },
  {
    id: "9",
    title: "Vector Databases",
    content: "Vector databases store embeddings and allow similarity queries.",
  },
  {
    id: "10",
    title: "JWT Authentication",
    content: "JWT is used for secure authentication between client and server.",
  },
];

await addNotes(notesData);

// ========================================
// EMBEDDING NOTES AND SEARCHING
// ========================================

const searchResults = await searchNotes(
  "Explain what vector databases are and how semantic search works",
  5
);
console.log("Search Results:", searchResults);

const results = await getAllDocuments();
console.log("All Documents in ChromaDB:", results);
