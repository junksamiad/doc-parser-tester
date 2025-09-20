# Document Parser Tester

A modern web application for testing document parsing APIs, specifically designed for passport document verification endpoints. Built with Next.js and TypeScript.

## Features

- **Multiple Upload Methods**:
  - JSON with Base64 encoding
  - Multipart form data (raw file upload)
  - Storage URL (upload to Vercel Blob and send URL)

- **Drag & Drop File Upload**: Easy file selection with drag and drop support
- **API Configuration**: Flexible endpoint URL and API key configuration
- **Response Viewer**: Clear, formatted display of API responses
- **File Support**: PDF, JPG, PNG, WebP, and HEIC files (max 20MB)

## Quick Start

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
2. **Import to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your repository
   - Click "Deploy"

3. **Configure Blob Storage** (Optional - for URL upload method):
   - Go to your Vercel project dashboard
   - Navigate to Storage tab
   - Create a new Blob store
   - Copy the `BLOB_READ_WRITE_TOKEN`
   - Add it to your environment variables

### Deploy to Netlify

For static export (without storage URL functionality):

1. Build the static export:
```bash
npm run build
```

2. Deploy the `.next` directory to Netlify

## Environment Variables

Copy `.env.local.example` to `.env.local` for local development:

```bash
cp .env.local.example .env.local
```

### Available Variables

- `BLOB_READ_WRITE_TOKEN`: Vercel Blob storage token for URL upload method (optional)

## Usage

1. **Configure API Endpoint**: Enter your document parser API endpoint URL
2. **Add API Key**: If your API requires authentication
3. **Upload Document**: Drag & drop or click to select a passport document
4. **Choose Send Method**:
   - **JSON/Base64**: Encodes file as base64 in JSON payload
   - **Form Data**: Sends raw file as multipart/form-data
   - **Storage URL**: Uploads to Vercel Blob and sends URL (requires configuration)
5. **Send Request**: Click to test your API
6. **View Response**: See formatted JSON response with metadata

## API Contract

The tester is designed for passport parsing endpoints that accept:

### Request Formats

1. **Multipart Form Data**:
   - Field: `document` (file)
   - Field: `document_type` (string: "passport")

2. **JSON with Base64**:
   ```json
   {
     "document": "base64_encoded_string",
     "document_type": "passport"
   }
   ```

3. **JSON with URL**:
   ```json
   {
     "document_url": "https://storage.url/file.pdf",
     "document_type": "passport"
   }
   ```

### Headers
- `x-api-key`: API authentication (optional)
- `Content-Type`: Set automatically based on method

## Development

### Tech Stack
- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- Lucide React Icons
- Vercel Blob Storage

### Project Structure
```
doc-parser-tester/
├── app/
│   ├── page.tsx           # Main application page
│   ├── api/
│   │   └── upload/
│   │       └── route.ts   # Storage upload endpoint
│   └── globals.css        # Global styles
├── public/                # Static assets
└── package.json          # Dependencies
```

## Testing Your Endpoint

The application is pre-configured to test against `http://localhost:3000/api/v1/passport`. You can change this to your actual endpoint URL.

### Example Response
```json
{
  "success": true,
  "data": {
    "passportAttributes": {
      "category": "PASSPORT",
      "attribute_types": {
        "personal_information": {...},
        "document_details": {...},
        "validity_status": {...}
      }
    }
  },
  "metadata": {
    "processingTime": "2.5s",
    "cost": {
      "formattedCost": "$0.002289"
    }
  }
}
```

## License

MIT