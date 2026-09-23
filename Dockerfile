# Stage 1: Base image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

# Stage 2: Build image
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy all project files first for restore layer caching
COPY ["DigitalMaktab.sln", "./"]
COPY ["src/DigitalMaktab.Core.Abstractions/DigitalMaktab.Core.Abstractions.csproj", "src/DigitalMaktab.Core.Abstractions/"]
COPY ["src/DigitalMaktab.SDK/DigitalMaktab.SDK.csproj", "src/DigitalMaktab.SDK/"]
COPY ["src/DigitalMaktab.Core/DigitalMaktab.Core.csproj", "src/DigitalMaktab.Core/"]
COPY ["src/DigitalMaktab.Country.Afghanistan/DigitalMaktab.Country.Afghanistan.csproj", "src/DigitalMaktab.Country.Afghanistan/"]
COPY ["src/DigitalMaktab.Api/DigitalMaktab.Api.csproj", "src/DigitalMaktab.Api/"]

# Restore dependencies for the whole solution
RUN dotnet restore "DigitalMaktab.sln"

# Copy the full source tree
COPY src/ src/

WORKDIR "/src/src/DigitalMaktab.Api"

# Build and publish the API host (produces digitalmaktabapi.dll — assembly name preserved)
RUN dotnet publish "DigitalMaktab.Api.csproj" -c Release -o /app/publish

# Stage 3: Final image
FROM base AS final
WORKDIR /app

# Copy the published output — Resources is included automatically because Core.csproj
# marks it as <Content CopyToOutputDirectory>.
COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "digitalmaktabapi.dll"]
