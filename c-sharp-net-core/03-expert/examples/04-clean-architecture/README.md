# Example 04 — Clean Architecture (Onion)

```
src/
 Catalog.Domain/  # Entities — ไม่พึ่ง framework
 Catalog.Application/ # Use cases + ports (interfaces)
 Catalog.Infrastructure/ # EF Core implementations
 Catalog.Api/  # HTTP + DI composition root
```

รัน:

```bash
dotnet run --project src/Catalog.Api
```

Dependency rule: **Api → Infrastructure → Application → Domain** (Domain ไม่รู้จักชั้นนอก)
