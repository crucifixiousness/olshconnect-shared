import { IoSearchCircle } from "react-icons/io5";

const Searchbar = ({ value, onChange }) => {
  return(
    <div className="searchBar position-relative d-flex align-items-center mb-3 w-100">
      <IoSearchCircle className="searchIcon"/>
      <input 
        type="text" 
        placeholder="Search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
export default Searchbar;
