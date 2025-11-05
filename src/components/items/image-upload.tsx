'use client';
import { useState } from 'react';
import { uploadItemImage } from '@/lib/actions';

export default function ImageUpload({ itemId }: { itemId: string }) {
  const [isUploading, setUploading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);
    const formData = new FormData(e.currentTarget);
    await uploadItemImage(formData);
    setUploading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 p-4 rounded-2xl bg-white max-w-sm"
    >
      <input type="hidden" name="itemId" value={itemId} />

      <div>
        <label
          htmlFor="file"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Upload Image
        </label>
        <input
          id="file"
          type="file"
          name="file"
          accept="image/*"
          required
          className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
                 file:rounded-md file:border-0 file:text-sm file:font-medium
                 file:bg-blue-50 file:text-blue-700
                 hover:file:bg-blue-100 cursor-pointer mt-4"
        />
      </div>

      <button
        type="submit"
        disabled={isUploading}
        className={`inline-flex justify-center items-center px-4 py-2 rounded-md text-sm font-medium
                transition-colors shadow-sm
                ${isUploading
            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
          }`}
      >
        {isUploading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4l3.5-3.5L12 0v4a8 8 0 100 16v4l3.5-3.5L12 20v4a8 8 0 01-8-8z"
              ></path>
            </svg>
            Uploading...
          </>
        ) : (
          'Upload Image'
        )}
      </button>
    </form>

  );
}
