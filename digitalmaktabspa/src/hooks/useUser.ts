import { useState, useEffect } from "react";
import { User } from "../models/User";
import { getUser } from "../helper/helper";

const useUser = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchedUser = getUser();
    if (
      fetchedUser &&
      typeof fetchedUser === "object" &&
      "role" in fetchedUser
    ) {
      setUser(fetchedUser as User);
    } else {
      setUser(null);
    }
  }, []);

  return user;
};

export default useUser;
