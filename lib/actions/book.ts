"use server";

import { eq } from "drizzle-orm";
import dayjs from "dayjs";

import { db } from "@/database/drizzle";
import { books, borrowRecords } from "@/database/schema";

// Borrow a book and update the available copies in the database
export const borrowBook = async (params: BorrowBookParams) => {
  const { userId, bookId } = params;

  try {
    // Check the book's availability
    const book = await db
      .select({ availableCopies: books.availableCopies })
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);

    // If the book doesn't exist or is unavailable, return an error
    if (!book.length || book[0].availableCopies <= 0) {
      return {
        success: false,
        error: "Book is not available for borrowing",
      };
    }

    // Calculate the due date (7 days from now)
    const dueDate = dayjs().add(7, "day").toDate().toDateString();

    // Start a transaction to ensure atomicity: insert the borrow record and update the book
    const transaction = await db.transaction(async (trx) => {
      // Insert the borrow record
      const record = await trx.insert(borrowRecords).values({
        userId,
        bookId,
        dueDate,
        status: "BORROWED",
      });

      // Update the book's available copies
      await db
        .update(books)
        .set({ availableCopies: book[0].availableCopies - 1 })
        .where(eq(books.id, bookId));

      // Return the borrow record data
      return record;
    });

    return {
      success: true,
      data: JSON.parse(JSON.stringify(transaction)),
    };
  } catch (error) {
    console.error("Error borrowing book:", error);

    return {
      success: false,
      error: "An error occurred while borrowing the book",
    };
  }
};
