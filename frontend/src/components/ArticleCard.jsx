import { formatEventDate } from '../utils/dateFormatter';

export default function ArticleCard({ article }) {
  return (
    <article className="bg-gray-900 p-6 rounded-lg shadow-lg flex flex-col">
      <h3 className="text-2xl font-semibold mb-2">{article.title}</h3>
      <p className="text-sm text-gray-400 mb-4">
        {article.source} • {formatEventDate(article.date)}
      </p>
      <p className="flex-1 oswald-400 mb-4">{article.description}</p>
      <a
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto text-blue-400 hover:underline"
      >
        Read More
      </a>
    </article>
  );
}
