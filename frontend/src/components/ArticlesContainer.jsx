import useFetch from '../hooks/useFetch.jsx';
import { getArticles } from '../services/articlesService.js';
import ArticleCard from './ArticleCard.jsx';
import Loading from './ui/Loading.jsx';
import ErrorMessage from './ui/ErrorMessage.jsx';
import InfoMessage from './ui/InfoMessage.jsx';

export default function ArticlesContainer() {
  const { isPending, isError, data: articles } = useFetch({ 
    queryFn: getArticles, 
    queryKey: ['articles'], 
    config: { staleTime: 10 * 60 * 1000 } 
  });

  // Sort articles by date (most recent first)
  const sortedArticles = articles ? [...articles].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  }) : [];

  return(
    <section className="py-20 bg-black text-white">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-5xl font-bold text-center racing-sans-one-regular mb-10">
          Articles About Us
        </h2>
        {isPending ? <Loading item="Articles" /> :
          isError ? <ErrorMessage>Could not load articles</ErrorMessage> :
            sortedArticles.length === 0 ? <InfoMessage >There are currently no articles to display. More coming soon!</InfoMessage> :
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {sortedArticles.map(article => <ArticleCard key={article.id} article={article}></ArticleCard>)}
              </div>
        }
      </div>
    </section>
  )
}
