import { Observable, expand, reduce, EMPTY } from 'rxjs';

const PAGE_SIZE = 200;

/**
 * Fetches all pages from a paginated API endpoint.
 * @param fetchPage A function that takes (skip, top) and returns an Observable of a page response
 *                  with `content: T[]` and `totalElements: number`.
 */
export function fetchAllPages<T>(
  fetchPage: (skip: number, top: number) => Observable<{ content?: T[]; totalElements?: number }>,
): Observable<T[]> {
  let skip = 0;
  let total = Infinity;

  return fetchPage(0, PAGE_SIZE).pipe(
    expand((response: any) => {
      const content: T[] = response.content || [];
      total = response.totalElements ?? content.length;
      skip += content.length;
      if (skip >= total || content.length === 0) {
        return EMPTY;
      }
      return fetchPage(skip, PAGE_SIZE);
    }),
    reduce((acc: T[], response: any) => acc.concat(response.content || []), [] as T[]),
  );
}
