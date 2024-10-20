export interface Base {
  id: string; // Guid in C# corresponds to string in TypeScript
  creationUserId: string;
  creationUserName: string;
  creationDate: Date;
  updateUserId: string;
  updateUserName: string;
  updateDate: Date;
  status: boolean;
}
