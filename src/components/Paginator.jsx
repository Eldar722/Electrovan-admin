import leftIcon from '../assets/images/icons/paginator/left-icon.svg';
import rightIcon from '../assets/images/icons/paginator/right-icon.svg';

function Paginator({ totalPages, currentPage, setCurrentPage }) {
    const getPages = () => {
        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                pages.push(i);
            }
        }
        return pages;
    };

    const pages = getPages();

    return (
        <section className="paginator text-body-lg">
            <button className="left-button" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                <img src={leftIcon} alt='left-icon' />
            </button>

            {pages.map((page, index) => {
                const prevPage = pages[index - 1];
                return (
                    <span key={page}>
                        {prevPage && page - prevPage > 1 && <span className='dots'>...</span>}
                        <button onClick={() => setCurrentPage(page)} className={currentPage === page ? "active" : ""}>
                            {page}
                        </button>
                    </span>
                );
            })}

            <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>
                <img src={rightIcon} alt='right-icon' />
            </button>
        </section>
    );
}

export default Paginator;
