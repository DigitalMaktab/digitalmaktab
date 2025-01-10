# Stage 1: Base image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

# Stage 2: Build image
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy the API project file
COPY ["digitalmaktabapi/digitalmaktabapi.csproj", "digitalmaktabapi/"]

# Restore dependencies
RUN dotnet restore "digitalmaktabapi/digitalmaktabapi.csproj"

# Copy the entire API project
COPY digitalmaktabapi/ digitalmaktabapi/

WORKDIR "/src/digitalmaktabapi"

# Build and publish the API project
RUN dotnet publish "digitalmaktabapi.csproj" -c Release -o /app/publish

# Stage 3: Final image
FROM base AS final
WORKDIR /app

# Copy the published output
COPY --from=build /app/publish .

# Ensure the Resources directory is included
COPY digitalmaktabapi/Resources /app/Resources

ENTRYPOINT ["dotnet", "digitalmaktabapi.dll"]
