import { useRef, useEffect } from "react";
import { User } from "../models/User";
// import { NoticeType } from "antd/es/message/interface";
// const KEY: string = "updatable";

const USER = "user";
const IS_MENU_OPEN = "isMenuOpen";

const isEmailValid = (email: string) => {
  const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  return emailPattern.test(email);
};

const saveUser = (user: User) => {
  localStorage.setItem(USER, JSON.stringify(user));
};

const getUser = (): User | null => {
  const userJson = localStorage.getItem(USER);
  if (userJson != null) {
    const user = JSON.parse(userJson) as User;
    return user;
  }
  return null;
};

const authenticated = (): boolean => {
  return getUser() == null ? false : true;
};

const removeUser = () => {
  localStorage.removeItem(USER);
};

const getCurrentLanguage = () => {
  const language = localStorage.getItem("i18nextLng");
  if (language != null) {
    return language;
  }
  return "en-US";
};

const saveOpenMenu = (open: string) => {
  localStorage.setItem(IS_MENU_OPEN, open);
};

const getOpenMenu = (): boolean => {
  return JSON.parse(localStorage.getItem(IS_MENU_OPEN)!);
};

const ChangeDocumentTitle = (title: string, prevailOnUnmount = false) => {
  const defaultTitle = useRef(document.title);

  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => () => {
    if (!prevailOnUnmount) {
      document.title = defaultTitle.current;
    }
  });
};

const getZonedDate = (date: string): string => {
  const typedDate = new Date(date);
  const formattedDate = typedDate.toLocaleString(undefined, {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
  return formattedDate.toString();
};

const getShortFormedDate = (date: string, yesterday: string): string => {
  const typedDate = new Date(date);

  // Get the current date, yesterday's date, and day before yesterday's date
  const currentDate = new Date();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(currentDate.getDate() - 1);
  const dayBeforeYesterdayDate = new Date();
  dayBeforeYesterdayDate.setDate(currentDate.getDate() - 2);

  // Check if the provided date is today
  const isToday =
    typedDate.getDate() === currentDate.getDate() &&
    typedDate.getMonth() === currentDate.getMonth() &&
    typedDate.getFullYear() === currentDate.getFullYear();

  // Check if the provided date is yesterday
  const isYesterday =
    typedDate.getDate() === yesterdayDate.getDate() &&
    typedDate.getMonth() === yesterdayDate.getMonth() &&
    typedDate.getFullYear() === yesterdayDate.getFullYear();

  // Check if the provided date is more than two days in the past
  const isDaysBeforeYesterday = typedDate < dayBeforeYesterdayDate;

  // Format the date accordingly
  const options: Intl.DateTimeFormatOptions = {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  };

  if (isYesterday) {
    // Format as "yesterday" if the date is yesterday
    return yesterday;
  } else if (isToday) {
    // Format as time if the date is today
    const formattedTime = typedDate.toLocaleString(undefined, options);
    return formattedTime.toString();
  } else if (isDaysBeforeYesterday) {
    // Format as date only if the date is more than two days in the past
    const formattedDate = typedDate.toLocaleString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return formattedDate.toString();
  } else {
    // Format the date as specified
    const formattedDate = typedDate.toLocaleString(undefined, {
      ...options,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return formattedDate.toString();
  }
};

// const openMessage = (
//   messageApi: any,
//   type: NoticeType | undefined,
//   content: React.ReactNode,
//   duration?: number
// ) => {
//   messageApi.open({
//     key: KEY,
//     type: type,
//     content: content,
//     duration: duration ? duration : 5,
//   });
// };

export {
  saveOpenMenu,
  getOpenMenu,
  isEmailValid,
  saveUser,
  getUser,
  removeUser,
  ChangeDocumentTitle,
  getCurrentLanguage,
  authenticated,
  getZonedDate,
  //   openMessage,
  getShortFormedDate,
};
