import { MongoDB_URL } from "@config";

export const dbConnection = {
  url: MongoDB_URL,
};

// export async function startMongoServer() {
//   const mongoServer = await MongoMemoryServer.create();

//   console.log('MongoDB started');
//   return mongoServer?.getUri() + 'sms-db';
// }
