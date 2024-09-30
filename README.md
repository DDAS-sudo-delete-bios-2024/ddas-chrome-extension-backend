# Backend

This is the code for our application server sitting in the local server (within the subnet). It is responsible for communicating with the frontend Chrome extension and provides a centralized solution. It also interacts with the database (present on the same machine) and saves and serves files to and from the repository (once again, on the same machine).

It has three primary tasks: 
1. **Check file existence**: The server checks whether the file details queried by the client exist in the database via the `/checkExistance` post endpoint. If the file does exist, the user will proceed to the third step.
2. **Download file**: If the file does not exist, the client sends the details of the file (triggered by a button click in the frontend). Upon receiving those details through the `/downloadFile` endpoint, it downloads the file to the local machine, ensuring real-time updates of the download to the client using WebSockets. After the download is complete, the frontend will automatically start the download.
3. **Access file**: A client can download the file from this local server using the GET method on the `/download/from/backend/:fileName` path.

We also aim to use Apache as our web server on top of this application server.

---

## Tools Used

- <img src="https://img.icons8.com/color/48/000000/nodejs.png" alt="Node.js" width="24"/> Node.js
- <img src="https://img.icons8.com/color/48/000000/express.png" alt="Express" width="24"/> Express
- <img src="https://img.icons8.com/color/48/000000/mongodb.png" alt="MongoDB" width="24"/> MongoDB
- <img src="https://www.apache.org/icons/apache_pb.png" alt="Apache" width="24"/> Apache
- <img src="https://img.icons8.com/color/48/000000/linux.png" alt="Linux" width="24"/> Linux
-  Websockets


---

## How to Replicate

1. **Install dependencies**: First, install the dependencies in the `package.json` file using:
   ```bash
   npm install
   ```
2. Ensure you have a downloads folder where the files will be downloaded.
3. Start the server using:
   ```bash
   npm run dev
   ```
