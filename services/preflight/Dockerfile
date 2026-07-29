FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    PREFLIGHT_EXPOSE_DOCS=false

WORKDIR /app
COPY pyproject.toml ./
COPY src ./src
RUN pip install --no-cache-dir .

RUN useradd --create-home --uid 10001 preflight
USER preflight
EXPOSE 8000

CMD ["uvicorn", "preflight_service.api:app", "--host", "0.0.0.0", "--port", "8000"]
