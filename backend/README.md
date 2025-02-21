Docker:

Chroma:
You can get the Chroma Docker image from Docker Hub, or from the Chroma GitHub Container Registry
```
docker pull chromadb/chroma
docker run -d --name mychroma -p 8000:8000 chromadb/chroma
```

PostgreSQL:
First, pull the PostgreSQL image:
```
docker pull postgres
```

Then, run this command to start the image.
```
docker run -d \
  --name mypostgres \
  -e POSTGRES_USER=mypostgresusername \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -e POSTGRES_DB=mydbname \
  -p 5432:5432 \
  postgres:latest
```

You'll also need to create a database inside your PostgreSQL container:
```
docker exec -it mypostgres createdb -U mypostgresusername mydbname
```

Ollama:
mistral: This model will be used for question rephrasing and answer generation.
nomic-embed-text: We'll use this model for embeddings generation.
