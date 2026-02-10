import logo from '../../asset/images/olshco-logo1.png';
import { Link } from "react-router-dom";

const Homeheader = () =>{
  return(
    <>
      <header className="d-flex align-items-center">
                <div className="container-fluid w-100">
                    <div className="row d-flex align-items-center w-100">
                        <div className="col-sm-2 part1">
                            <Link to={'/'} className="d-flex align-items-center logo">
                                <img src={logo} alt="samp"/>
                                <span className="ml-2">OLSHCO</span>
                            </Link>              
                        </div>
                        <div className="col-sm-6 ml-auto d-flex align-items-center part2">
                            <nav>
                                <ul className="nav-list d-flex">
                                  <li><Link to="#home">Home</Link></li>
                                  <li><Link to="#school">School</Link></li>
                                  <li><Link to="#courses">Offered Course</Link></li>
                                  <li><Link to="#announcement">Announcement</Link></li>
                                  <li><Link to="#contact">Contact</Link></li>
                                  <li><Link to="/login">Login</Link></li>
                                </ul>
                            </nav>
                        </div>           
                    </div>                                                 
                </div>
      </header>
    </>
  )
}
export default Homeheader;