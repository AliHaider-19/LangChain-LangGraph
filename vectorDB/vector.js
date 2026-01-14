import { CloudClient } from "chromadb";
import { embedTexts } from "./embedText.js";

// ========================================
// INITIALIZE CHROMADB CLIENT
// ========================================
// CloudClient connects to ChromaDB cloud instance
// You can also use ChromaClient() for local instances
const client = new CloudClient({
  apiKey: process.env.CHROMA_API_KEY,
  tenant: "b3c13a1f-f7de-4336-b2ca-0dadfc8f6ae9",
  database: "SmartNotesSearch",
});

// ========================================
// CREATE OR GET COLLECTION
// ========================================
// Collections are like tables in traditional databases
// They store documents, embeddings, and metadata
// getOrCreateCollection: Creates new collection or gets existing one
const collection = await client.getOrCreateCollection({
  name: "documents",
  embeddingFunction: null, // Set to null if providing custom embeddings
});

// ========================================
// 1. INSERTION - Add new documents to collection
// ========================================
// add() method inserts new documents with embeddings and metadata
// Each document needs: unique ID, document text, optional metadata, and embeddings
async function insertDocuments(texts, metadatas) {
  try {
    // Generate embeddings for the text documents
    const embeddings = await embedTexts(texts);

    // Generate unique IDs for each document
    const ids = texts.map((_, i) => `doc-${Date.now()}-${i}`);

    // Add documents to collection
    await collection.add({
      ids: ids, // Unique identifier for each document
      documents: texts, // The actual text content
      metadatas: metadatas, // Additional information (title, author, tags, etc.)
      embeddings: embeddings, // Vector representations of documents
    });

    console.log(`✅ Inserted ${texts.length} documents successfully`);
    return ids;
  } catch (error) {
    console.error("❌ Error inserting documents:", error.message);
  }
}

// ========================================
// 2. UPSERT - Insert or Update documents
// ========================================
// upsert() updates existing documents if ID exists, otherwise inserts new ones
// Useful when you're not sure if document exists
async function upsertDocuments(ids, texts, metadatas) {
  try {
    const embeddings = await embedTexts(texts);

    await collection.upsert({
      ids: ids,
      documents: texts,
      metadatas: metadatas,
      embeddings: embeddings,
    });

    console.log(`✅ Upserted ${texts.length} documents successfully`);
  } catch (error) {
    console.error("❌ Error upserting documents:", error.message);
  }
}

// ========================================
// 3. UPDATE - Modify existing documents
// ========================================
// update() modifies documents, metadata, or embeddings for existing IDs
// All fields are optional - update only what you need
async function updateDocuments(ids, newTexts = null, newMetadatas = null) {
  try {
    const updateData = { ids: ids };

    // Update document text and regenerate embeddings if new text provided
    if (newTexts) {
      const newEmbeddings = await embedTexts(newTexts);
      updateData.documents = newTexts;
      updateData.embeddings = newEmbeddings;
    }

    // Update metadata if provided
    if (newMetadatas) {
      updateData.metadatas = newMetadatas;
    }

    await collection.update(updateData);
    console.log(`✅ Updated ${ids.length} documents successfully`);
  } catch (error) {
    console.error("❌ Error updating documents:", error.message);
  }
}

// ========================================
// 4. DELETION - Remove documents from collection
// ========================================

// Delete specific documents by their IDs
async function deleteDocumentsById(ids) {
  try {
    await collection.delete({
      ids: ids,
    });
    console.log(`✅ Deleted ${ids.length} documents by ID`);
  } catch (error) {
    console.error("❌ Error deleting documents:", error.message);
  }
}

// Delete documents matching metadata filters
// Example: Delete all documents by a specific author
async function deleteDocumentsByFilter(whereFilter) {
  try {
    await collection.delete({
      where: whereFilter, // e.g., { author: "John" } or { category: "old" }
    });
    console.log(`✅ Deleted documents matching filter`);
  } catch (error) {
    console.error("❌ Error deleting by filter:", error.message);
  }
}

// Delete ALL documents from collection (use with caution!)
async function deleteAllDocuments() {
  try {
    await collection.delete({
      deleteAll: true,
    });
    console.log(`✅ Deleted all documents from collection`);
  } catch (error) {
    console.error("❌ Error deleting all documents:", error.message);
  }
}

// ========================================
// 5. SEARCHING - Semantic similarity search
// ========================================
// query() finds documents most similar to your search text
// Uses vector similarity (cosine distance) to find relevant results
async function searchDocuments(queryText, nResults = 5, whereFilter = null) {
  try {
    // Generate embedding for search query
    const queryEmbedding = await embedTexts([queryText]);

    const queryParams = {
      queryEmbeddings: queryEmbedding, // Vector representation of search query
      nResults: nResults, // Number of results to return
    };

    // Optional: Filter results by metadata
    if (whereFilter) {
      queryParams.where = whereFilter; // e.g., { category: "tech" }
    }

    const results = await collection.query(queryParams);

    console.log(`🔍 Found ${results.ids[0].length} similar documents`);
    return results;
  } catch (error) {
    console.error("❌ Error searching documents:", error.message);
  }
}

// Search using text directly (ChromaDB generates embeddings automatically)
// Only works if collection has embeddingFunction configured
async function searchDocumentsByText(queryText, nResults = 5) {
  try {
    const results = await collection.query({
      queryTexts: [queryText], // Text query (no need for manual embeddings)
      nResults: nResults,
    });

    console.log(`🔍 Found ${results.ids[0].length} documents`);
    return results;
  } catch (error) {
    console.error("❌ Error searching by text:", error.message);
  }
}

// ========================================
// 6. FETCHING - Retrieve documents
// ========================================

// Get ALL documents from collection
async function getAllDocuments() {
  try {
    const results = await collection.get();
    console.log(`📄 Retrieved ${results.ids.length} total documents`);
    return results;
  } catch (error) {
    console.error("❌ Error getting all documents:", error.message);
  }
}

// Get specific documents by their IDs
async function getDocumentsById(ids) {
  try {
    const results = await collection.get({
      ids: ids,
    });
    console.log(`📄 Retrieved ${results.ids.length} documents by ID`);
    return results;
  } catch (error) {
    console.error("❌ Error getting documents by ID:", error.message);
  }
}

// Get documents with metadata filters
// Example: Get all documents with category="tech"
async function getDocumentsByFilter(whereFilter, limit = null) {
  try {
    const params = {
      where: whereFilter, // e.g., { author: "Alice" } or { year: { $gt: 2020 } }
    };

    if (limit) {
      params.limit = limit; // Limit number of results
    }

    const results = await collection.get(params);
    console.log(`📄 Retrieved ${results.ids.length} documents by filter`);
    return results;
  } catch (error) {
    console.error("❌ Error getting documents by filter:", error.message);
  }
}

// Get document count in collection
async function getDocumentCount() {
  try {
    const results = await collection.count();
    console.log(`📊 Collection contains ${results} documents`);
    return results;
  } catch (error) {
    console.error("❌ Error getting document count:", error.message);
  }
}

// ========================================
// 7. COLLECTION MANAGEMENT
// ========================================

// List all collections in database
async function listAllCollections() {
  try {
    const collections = await client.listCollections();
    console.log(`📚 Found ${collections.length} collections`);
    return collections;
  } catch (error) {
    console.error("❌ Error listing collections:", error.message);
  }
}

// Modify collection metadata
async function modifyCollectionMetadata(newMetadata) {
  try {
    await collection.modify({
      metadata: newMetadata, // e.g., { description: "Updated collection" }
    });
    console.log(`✅ Collection metadata updated`);
  } catch (error) {
    console.error("❌ Error modifying collection:", error.message);
  }
}

// Delete entire collection (careful - this removes all data!)
async function deleteCollection(collectionName) {
  try {
    await client.deleteCollection({ name: collectionName });
    console.log(`🗑️ Collection "${collectionName}" deleted`);
  } catch (error) {
    console.error("❌ Error deleting collection:", error.message);
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Pretty print search/fetch results
function displayResults(results) {
  console.log("\n📋 Results:");
  if (results.ids && results.ids.length > 0) {
    results.ids[0]?.forEach((id, idx) => {
      console.log(`\n--- Document ${idx + 1} ---`);
      console.log(`ID: ${id}`);
      console.log(`Text: ${results.documents[0]?.[idx]}`);
      console.log(`Metadata:`, results.metadatas[0]?.[idx]);
      if (results.distances && results.distances[0]) {
        console.log(`Distance: ${results.distances[0][idx].toFixed(4)}`);
      }
    });
  } else if (results.ids) {
    results.ids.forEach((id, idx) => {
      console.log(`\n--- Document ${idx + 1} ---`);
      console.log(`ID: ${id}`);
      console.log(`Text: ${results.documents[idx]}`);
      console.log(`Metadata:`, results.metadatas[idx]);
    });
  }
}

// ========================================
// EXAMPLE USAGE - Uncomment to test
// ========================================

async function runExamples() {
  console.log("\n🚀 Starting ChromaDB Examples...\n");

  // Example 1: Insert documents
  console.log("=== EXAMPLE 1: INSERT DOCUMENTS ===");
  const insertedIds = await insertDocuments(
    [
      "LangChain is a framework for building applications with LLMs",
      "Vector databases store data as high-dimensional vectors",
      "Machine learning models can understand semantic meaning",
    ],
    [
      { category: "tech", topic: "LangChain", year: 2024 },
      { category: "tech", topic: "databases", year: 2024 },
      { category: "ai", topic: "ML", year: 2024 },
    ]
  );

  // Example 2: Get all documents
  console.log("\n=== EXAMPLE 2: FETCH ALL DOCUMENTS ===");
  const allDocs = await getAllDocuments();
  displayResults(allDocs);

  // Example 3: Search for similar documents
  console.log("\n=== EXAMPLE 3: SEMANTIC SEARCH ===");
  const searchResults = await searchDocuments(
    "How do I work with language models?",
    2 // Get top 2 results
  );
  displayResults(searchResults);

  // Example 4: Update a document
  if (insertedIds && insertedIds.length > 0) {
    console.log("\n=== EXAMPLE 4: UPDATE DOCUMENT ===");
    await updateDocuments(
      [insertedIds[0]],
      ["LangChain is an amazing framework for LLM applications"],
      [{ category: "tech", topic: "LangChain", year: 2024, updated: true }]
    );
  }

  // Example 5: Get documents by filter
  console.log("\n=== EXAMPLE 5: FETCH BY FILTER ===");
  const filteredDocs = await getDocumentsByFilter({ category: "tech" });
  displayResults(filteredDocs);

  // Example 6: Get document count
  console.log("\n=== EXAMPLE 6: DOCUMENT COUNT ===");
  await getDocumentCount();

  // Example 7: Upsert (update or insert)
  console.log("\n=== EXAMPLE 7: UPSERT ===");
  await upsertDocuments(
    ["custom-id-1"],
    ["This document will be inserted or updated"],
    [{ category: "test", operation: "upsert" }]
  );

  // Example 8: Delete specific document
  if (insertedIds && insertedIds.length > 1) {
    console.log("\n=== EXAMPLE 8: DELETE BY ID ===");
    await deleteDocumentsById([insertedIds[1]]);
  }

  // Example 9: List all collections
  console.log("\n=== EXAMPLE 9: LIST COLLECTIONS ===");
  await listAllCollections();

  console.log("\n✅ All examples completed!\n");
}

// Run examples - Comment out if you don't want to execute
// runExamples();

// Export functions for use in other files
export {
  insertDocuments,
  upsertDocuments,
  updateDocuments,
  deleteDocumentsById,
  deleteDocumentsByFilter,
  deleteAllDocuments,
  searchDocuments,
  searchDocumentsByText,
  getAllDocuments,
  getDocumentsById,
  getDocumentsByFilter,
  getDocumentCount,
  listAllCollections,
  modifyCollectionMetadata,
  deleteCollection,
  displayResults,
};
