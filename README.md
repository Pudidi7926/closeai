# Close AI - Chatbot Assistant

A sophisticated AI chatbot built with React, Vite, and Google Gemini 3 Flash.

## 🚀 Deployment Guide

### Environment Variables
You need to set the following variable in your deployment platform (Vercel/Netlify):
- `GEMINI_API_KEY`: Your Google AI Studio API Key.

### Deploy to Vercel
1. Connect your GitHub repository to Vercel.
2. Add the `GEMINI_API_KEY` in the project settings under **Environment Variables**.
3. Deploy!

### Deploy to Netlify
1. Connect your repository to Netlify.
2. Set the build command to `npm run build` and publish directory to `dist`.
3. Add `GEMINI_API_KEY` in **Site Configuration > Environment Variables**.
4. Deploy!

## 🛠️ Tech Stack
- **Frontend**: React 18, Vite
- **Styling**: Tailwind CSS
- **AI Model**: Gemini 3 Flash Preview
- **Animations**: Framer Motion
- **Icons**: Lucide React
