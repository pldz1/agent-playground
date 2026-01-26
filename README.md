# Agent Playground

## Building the Desktop Web Application

Agent Playground is a **web application developed in TypeScript**. This makes it easy to build a **desktop application** using **Python** and **WebView2**.

### 1. Build the Web Resource Files

Before creating the desktop application, you need to build the web application and generate the distribution files.

1. Prepare the **environment** file, Copy the contents of `.env.example` to `.env`.

2. Navigate to the `frontend` folder and run:

   ```bash
   npm run build
   ```

   This will generate the `dist` files.

3. Copy the contents of `frontend/dist` to `desktop/dist`.

4. Install the required Python dependencies:

   ```bash
   pip3 install -r requirements.txt
   ```
