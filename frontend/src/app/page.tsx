export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="max-w-md w-full flex flex-col items-center justify-center space-y-4 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Tawlax.
        </h1>
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
          <p className="text-zinc-600 dark:text-zinc-400 font-medium">
            Please scan the QR code on your table to view the menu and start ordering.
          </p>
        </div>
      </div>
    </div>
  );
}
