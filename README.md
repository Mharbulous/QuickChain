# QuickChain

A simple web application for viewing email chains from `.msg` files in chronological order.

## Features

- **Drag & Drop**: Drop `.msg` files onto the app to process them
- **Chronological Ordering**: Emails are automatically sorted by send time (earliest first)
- **Email Chain Merging**: Multiple email chains are merged into a single chronological view
- **Duplicate Detection**: Automatically ignores duplicate emails
- **Processing Queue**: Visual feedback showing file processing status
- **Full Headers**: Displays complete email headers (From, To, Cc, Date, Subject)
- **Attachment List**: Shows attachment names (files are not extracted)
- **Plain Text Display**: HTML emails are converted to plain text for easy reading
- **Error Handling**: Toast notifications for parsing errors and invalid files

## Usage

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to the URL shown (typically `http://localhost:5173`)

4. Drop `.msg` files onto the drop zone or click to browse

5. View your emails in chronological order

6. Use "Clear All" to reset the application

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Technology Stack

- Vanilla JavaScript (ES6 modules)
- Vite (build tool and dev server)
- [@kenjiuno/msgreader](https://github.com/kenjiuno/msgreader) (`.msg` file parsing)

## How It Works

1. Users drop or select `.msg` files
2. Files are added to a processing queue
3. Each file is parsed to extract email metadata and body
4. Emails are added to a chain with duplicate detection
5. The chain is rendered in chronological order (earliest first)
6. Multiple email chains automatically merge based on send time

## License

MIT
