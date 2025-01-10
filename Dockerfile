# Stage 1: Base image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

# Stage 2: Build API image
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

# Stage 3: Build React app
FROM node:18 AS react-build
WORKDIR /react-app

# Copy React app package files
COPY digitalmaktabspa/package.json digitalmaktabspa/package-lock.json ./

# Install dependencies
RUN npm install

# Copy the entire React app
COPY digitalmaktabspa/ ./

# Build the React app
RUN npm run build

# Stage 4: Final image
FROM base AS final
WORKDIR /app

# Copy the published API output
COPY --from=build /app/publish .

# Copy the React app build to the API's wwwroot folder
COPY --from=react-build /react-app/build /app/wwwroot

# Ensure the Resources directory is included
COPY digitalmaktabapi/Resources /app/Resources

ENTRYPOINT ["dotnet", "digitalmaktabapi.dll"]
