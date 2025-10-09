# Complete Architecture: File Upload Methods

## Summary

**Existing endpoints:** Keep them all (passport, driving-licence, etc.)
**New endpoint needed:** 1 endpoint: `POST /api/v2/get-presigned-url`
**Client tools:** JavaScript component (browser) + Bash script (programmatic)

---

## Flow Diagram (Mermaid)

```mermaid
graph TD
    subgraph "METHOD 1: documentUrl (No Changes)"
        A1[Client has file in storage] --> A2[POST /api/v2/passport]
        A2 --> A3[Body: documentUrl]
        A3 --> A4[Existing middleware chain]
        A4 --> A5[Queue handler]
        A5 --> A6[Returns 202 Accepted]
    end

    subgraph "METHOD 2: Small Files - multipart/base64 (Add Size Check)"
        B1[Client has file <6MB] --> B2[POST /api/v2/passport]
        B2 --> B3[Body: multipart OR base64]
        B3 --> B4[NEW: File size check middleware]
        B4 -->|File <6MB| B5[Existing middleware chain]
        B4 -->|File >6MB| B6[Return 413 Error: Use presigned URL method]
        B5 --> B7[Queue handler]
        B7 --> B8[Returns 202 Accepted]
    end

    subgraph "METHOD 3: Large Files - Presigned S3 (NEW)"
        C1[Client has file >6MB] --> C2{Client Type?}

        C2 -->|Browser| C3[JavaScript component]
        C2 -->|Programmatic| C4[Bash script]

        C3 --> C5[Step 1: POST /api/v2/get-presigned-url]
        C4 --> C5

        C5 --> C6[NEW Lambda Function]
        C6 --> C7[Validate API key]
        C7 --> C8[Generate requestId]
        C8 --> C9[Store metadata in DynamoDB]
        C9 --> C10[Generate presigned S3 URL]
        C10 --> C11[Return uploadUrl to client]

        C11 --> C12{Client Type?}
        C12 -->|Browser| C13[JavaScript uploads to S3]
        C12 -->|Programmatic| C14[Script uploads to S3]

        C13 --> C15[Step 2: PUT file to S3 URL]
        C14 --> C15

        C15 --> C16[S3 receives file]
        C16 --> C17[S3 Event: ObjectCreated]
        C17 --> C18[NEW Processing Lambda triggered]
        C18 --> C19[Fetch metadata from DynamoDB]
        C19 --> C20[Download file from S3]
        C20 --> C21[Process document]
        C21 --> C22[Send webhook]
    end
```

---

## Detailed Flow Breakdown

### 🟢 **METHOD 1: documentUrl (Unchanged)**

**Use case:** File already in external storage (S3, Blob, CDN)

**Flow:**
```
Client → POST /api/v2/passport
Body: { "documentUrl": "https://..." }
      ↓
Existing middleware chain (no changes)
      ↓
Queue handler
      ↓
202 Accepted
```

**Changes needed:** ❌ **NONE**

---

### 🟡 **METHOD 2: multipart/base64 - Small Files (Add Size Check)**

**Use case:**
- Webhook auto-forwards
- Small files (<6MB)
- Simple integrations

**Flow:**
```
Client → POST /api/v2/passport
Body: multipart OR base64 (file <6MB)
      ↓
NEW: withFileSizeCheck middleware
      ↓
  Is file <6MB?
      ↓
    YES → Existing middleware chain
         → Queue handler
         → 202 Accepted
      ↓
    NO → Return 413 Error:
         "File too large. Use presigned URL method."
         Include instructions for Method 3
```

**Changes needed:**
1. ✅ Add `withFileSizeCheck` middleware (reject >6MB)
2. ✅ Return helpful error with presigned URL instructions

---

### 🔵 **METHOD 3: Presigned S3 - Large Files (NEW)**

**Use case:**
- Large files (>6MB)
- Your frontend
- Batch uploads

#### **STEP 1: Get Presigned URL**

**NEW Endpoint:** `POST /api/v2/get-presigned-url`

**Request:**
```json
{
  "documentType": "passport",
  "businessId": "123",
  "webhookUrl": "https://...",
  "documentPart": "front"
}
```

**Lambda does:**
1. Validate API key
2. Generate unique requestId
3. **Store metadata in DynamoDB:**
   ```json
   {
     "requestId": "req_abc123",
     "documentType": "passport",
     "businessId": "123",
     "webhookUrl": "https://...",
     "documentPart": "front",
     "apiKeyId": 456,
     "clientId": 789,
     "expiresAt": 1234567890
   }
   ```
4. **Generate presigned S3 URL** (15 min expiry)
   - Path: `uploads/{requestId}/document.pdf`
5. Return URL

**Response:**
```json
{
  "uploadUrl": "https://bucket.s3.amazonaws.com/uploads/req_abc123/document.pdf?signature=...",
  "requestId": "req_abc123",
  "expiresIn": 900
}
```

**Lambda completes ✅** (does NOT upload file)

---

#### **STEP 2: Client Uploads to S3**

**Browser (JavaScript component):**
```javascript
// Automatic - user just drops file
const { uploadUrl } = await getPresignedUrl()
await fetch(uploadUrl, { method: 'PUT', body: file })
```

**Programmatic (Bash script):**
```bash
# User runs script
./upload-document.sh passport.pdf passport

# Script does:
URL=$(curl POST /api/v2/get-presigned-url ...)
curl -X PUT "$URL" --upload-file passport.pdf
```

**File uploaded to S3 ✅**

---

#### **STEP 3: S3 Triggers Processing**

**S3 Event:** ObjectCreated on `uploads/*`

**NEW Processing Lambda triggered:**
1. Extract requestId from S3 path: `uploads/req_abc123/document.pdf`
2. **Fetch metadata from DynamoDB** using requestId
3. Download file from S3
4. Reconstruct full context (file + metadata)
5. Process document (AI parsing, activity, costs, debit, transaction)
6. Send webhook
7. Clean up S3 file

---

## What Needs to Be Built

### ✅ **Backend Changes:**

1. **Add file size check to existing endpoints**
   - New middleware: `withFileSizeCheck`
   - Reject files >6MB with helpful error
   - Add to existing passport/driving-licence routes

2. **New endpoint: `POST /api/v2/get-presigned-url`**
   - Lambda function that:
     - Validates API key
     - Generates requestId
     - Stores metadata in DynamoDB
     - Generates presigned S3 URL
     - Returns URL

3. **DynamoDB table: `request-metadata`**
   - Primary key: requestId
   - TTL: 24 hours auto-delete

4. **S3 bucket configuration**
   - Bucket for uploads: `document-uploads`
   - Event trigger on ObjectCreated
   - Lifecycle rule: delete files after 24 hours

5. **New Processing Lambda** (S3 event trigger)
   - Fetches metadata from DynamoDB
   - Downloads file from S3
   - Processes document
   - Sends webhook

---

### ✅ **Frontend Changes:**

1. **JavaScript client component** (browser uploads)
   ```typescript
   // app/upload/UploadComponent.tsx
   'use client'

   async function handleFileUpload(file: File) {
     // Step 1: Get presigned URL
     const { uploadUrl } = await fetch('/api/v2/get-presigned-url', {
       method: 'POST',
       body: JSON.stringify({ documentType: 'passport' })
     }).then(r => r.json())

     // Step 2: Upload to S3
     await fetch(uploadUrl, { method: 'PUT', body: file })

     // Done - S3 triggers processing
   }
   ```

---

### ✅ **Client Tools:**

1. **Bash script for programmatic users**
   ```bash
   # upload-document.sh
   # Wraps both steps (get URL + upload)
   # User runs: ./upload-document.sh file.pdf passport
   ```

---

## File Size Limits by Method

| Method | Vercel Limit | AWS Limit | Best For |
|--------|--------------|-----------|----------|
| **documentUrl** | No limit | No limit | Files already in storage |
| **multipart/base64** | 4.5MB | 6MB | Small files, webhooks |
| **Presigned S3** | No limit | 5TB (S3 max) | Large files, batches |

---

## Summary: What Changes?

### **Keep (No Changes):**
- ✅ All existing endpoints (`/api/v2/passport`, `/api/v2/driving-licence`)
- ✅ documentUrl method (works perfectly)
- ✅ Existing middleware chain
- ✅ Queue handler
- ✅ Processing service

### **Add (New):**
- ✅ 1 new endpoint: `/api/v2/get-presigned-url`
- ✅ 1 new middleware: `withFileSizeCheck` (rejects >6MB)
- ✅ 1 DynamoDB table: `request-metadata`
- ✅ 1 S3 bucket + event trigger
- ✅ 1 Processing Lambda (S3 event handler)
- ✅ JavaScript component (browser)
- ✅ Bash script (programmatic)

### **Modify (Small Changes):**
- ✅ Add file size check to existing routes
- ✅ Return 413 error with instructions for large files

---

## Client Decision Tree

```
Do you have a file to upload?
│
├─ Is it already in external storage (S3/Blob/CDN)?
│  └─ YES → Use METHOD 1: documentUrl ✅
│
├─ Is it a small file (<6MB)?
│  └─ YES → Use METHOD 2: multipart/base64 ✅
│
└─ Is it a large file (>6MB)?
   └─ YES → Use METHOD 3: Presigned S3 ✅
      │
      ├─ Browser upload?
      │  └─ Use JavaScript component
      │
      └─ Programmatic upload?
         └─ Use bash script
```

---

## Architecture Complete ✅

**Total new endpoints:** 1 (`/api/v2/get-presigned-url`)
**Total new Lambda functions:** 2 (presigned URL generator + S3 event processor)
**Existing endpoints:** Keep all, add size check
**Client complexity:** Hidden by JavaScript/scripts
